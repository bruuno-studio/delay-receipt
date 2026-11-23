import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, scanShameWallHubs } from "@/lib/airnodehub";
import { getServerSecret } from "@/lib/cfEnv";
import { recordEvent, saveProof } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Protected admin / Cloudflare Cron endpoint to refresh Today's Shame Wall
 * with real 3h+ clear-sky delayed flights while respecting a strict aUSD budget cap.
 */
export async function POST(request: NextRequest) {
  const configuredSecret = await getServerSecret("SCAN_SECRET");
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  if (!isDemoMode()) {
    if (!configuredSecret) {
      return NextResponse.json(
        {
          error:
            "SCAN_SECRET is not configured. Set SCAN_SECRET as a Cloudflare Worker secret before invoking live Shame Wall scans.",
        },
        { status: 403 }
      );
    }
    if (bearer !== configuredSecret && querySecret !== configuredSecret) {
      return NextResponse.json(
        { error: "Unauthorized scan request." },
        { status: 401 }
      );
    }
  }

  const body = (await request.json().catch(() => ({}))) as {
    airports?: string[];
    maxResults?: number;
    maxBudgetUsd?: number;
  };

  const result = await scanShameWallHubs({
    airports: body.airports,
    maxResults: Math.min(4, body.maxResults ?? 4),
    maxBudgetUsd: Math.min(0.6, body.maxBudgetUsd ?? 0.45),
  });

  for (const proof of result.discovered) {
    await saveProof(proof);
    await recordEvent({
      type: "cards_generated",
      proofId: proof.id,
      meta: {
        source: "shame_wall_scan",
        flightNumber: proof.flightNumber,
        mode: proof.mode,
      },
    });
  }

  if (result.spentUsd > 0) {
    await recordEvent({
      type: "airnodehub_calls",
      costUsd: result.spentUsd,
      meta: {
        source: "shame_wall_scan",
        callCount: result.scannedHubs.length + result.discovered.length * 3,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    scannedHubs: result.scannedHubs,
    discoveredCount: result.discovered.length,
    spentUsd: result.spentUsd,
    proofIds: result.discovered.map((p) => p.id),
  });
}
