import { NextRequest, NextResponse } from "next/server";
import { getServerSecret } from "@/lib/cfEnv";
import { getMetricsSnapshot, recordEvent } from "@/lib/storage";
import type { FunnelEventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set<FunnelEventType>([
  "cards_generated",
  "airnodehub_calls",
  "x_share_clicks",
  "proof_views",
  "signature_checks",
  "mcp_config_copies",
  "png_downloads",
  "claim_email_copies",
  "voice_plays",
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      proofId?: string;
      meta?: Record<string, string | number | boolean>;
    };

    if (!body.type || !ALLOWED_EVENTS.has(body.type as FunnelEventType)) {
      return NextResponse.json(
        { error: "Invalid funnel event type." },
        { status: 400 }
      );
    }

    const evt = await recordEvent({
      type: body.type as FunnelEventType,
      proofId: body.proofId,
      meta: body.meta,
    });

    return NextResponse.json({ ok: true, event: evt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Event logging failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const gateKey = await getServerSecret("METRICS_ACCESS_KEY");
  if (gateKey) {
    const provided = request.nextUrl.searchParams.get("key") || "";
    if (provided !== gateKey) {
      return NextResponse.json(
        { error: "Metrics access key required." },
        { status: 401 }
      );
    }
  }

  const snapshot = await getMetricsSnapshot();
  return NextResponse.json(snapshot);
}
