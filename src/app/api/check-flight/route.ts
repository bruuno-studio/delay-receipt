import { NextRequest, NextResponse } from "next/server";
import { normalizeFlightNumber } from "@/lib/airlines";
import { fetchSignedFlightProof, isDemoMode } from "@/lib/airnodehub";
import {
  checkAndConsumeRateLimit,
  getProofByCacheKey,
  recordEvent,
  saveProof,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      flightNumber?: string;
      date?: string;
    };

    const rawFlight = (body.flightNumber || "").trim();
    const rawDate = (body.date || "").trim();

    const flightNumber = normalizeFlightNumber(rawFlight);
    if (!/^[A-Z0-9]{2}[A-Z]?\d{1,4}[A-Z]?$/.test(flightNumber)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid IATA flight number such as LH400, FR1234, BA456, or TK1951.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return NextResponse.json(
        { error: "Select a valid flight date in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const cacheKey = `${flightNumber}:${rawDate}`;
    const cached = await getProofByCacheKey(cacheKey);
    if (cached) {
      return NextResponse.json({
        proof: cached,
        cached: true,
        mode: cached.mode,
      });
    }

    // Enforce IP rate limit before incurring any live x402 API spend
    const clientIp = extractClientIp(request);
    const rate = await checkAndConsumeRateLimit(clientIp);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit reached for live lookups. Retry in ${Math.ceil(rate.resetInSeconds / 60)} minutes or view cached receipts.`,
          resetInSeconds: rate.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const proof = await fetchSignedFlightProof({
      flightNumber,
      flightDate: rawDate,
    });

    await saveProof(proof);

    await Promise.all([
      recordEvent({
        type: "cards_generated",
        proofId: proof.id,
        meta: {
          flightNumber: proof.flightNumber,
          mode: proof.mode,
          weatherVerdict: proof.verdict.weatherVerdict,
          delayMinutes: proof.verdict.delayMinutes,
        },
      }),
      recordEvent({
        type: "airnodehub_calls",
        proofId: proof.id,
        costUsd: proof.totalApiCostUsd,
        meta: {
          callCount: proof.attestations.length,
          mode: proof.mode,
          demo: isDemoMode(),
        },
      }),
    ]);

    return NextResponse.json({
      proof,
      cached: false,
      mode: proof.mode,
      rateLimitRemaining: rate.remaining,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to verify flight telemetry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
