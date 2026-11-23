import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import {
  formatUtcTime,
  generateDeterministicBarcode,
} from "@/lib/rules";
import { getProofById } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const proof = await getProofById(id);

  const isHd = request.nextUrl.searchParams.get("hd") === "1";
  const isDownload = request.nextUrl.searchParams.get("download") === "1";
  const width = isHd ? 1600 : 1200;
  const height = isHd ? 840 : 630;

  if (!proof) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#111111",
            color: "#F3F1EA",
            fontFamily: "monospace",
            padding: "48px",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.2em", color: "#D92D20" }}>
            {"DELAY RECEIPT · RECORD NOT FOUND"}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, marginTop: 16 }}>
            {`PROOF ID: ${id.toUpperCase()}`}
          </div>
        </div>
      ),
      { width, height }
    );
  }

  const stampColor =
    proof.verdict.stampTone === "red"
      ? "#D92D20"
      : proof.verdict.stampTone === "green"
        ? "#16A34A"
        : "#D97706";

  const primaryAttest = proof.attestations[0];
  const barcodeBars = generateDeterministicBarcode(
    primaryAttest?.signature || proof.id,
    46
  );

  const scale = isHd ? 1.33 : 1;
  const px = (n: number) => Math.round(n * scale);

  const routeSubline = `${proof.departure.municipality.toUpperCase()} TO ${proof.arrival.municipality.toUpperCase()} · ${proof.verdict.compensation.distanceKm.toLocaleString("en-US")} KM`;
  const delayBasisLabel =
    proof.verdict.delayBasis === "CANCELLED"
      ? "VERIFIED FLIGHT CANCELLATION"
      : proof.verdict.delayBasis === "DEPARTURE_DELAY"
        ? "VERIFIED DEPARTURE DELAY"
        : "VERIFIED ARRIVAL DELAY";
  const triggerLine =
    proof.verdict.weatherTriggerReason || proof.verdict.disclaimer;
  const schedArrLabel = `SCHED ARR: ${formatUtcTime(proof.scheduledArrivalUtc)}`;
  const actualArrLabel = `ACTUAL ARR: ${formatUtcTime(proof.actualArrivalUtc)}`;
  const depWeatherHeader = `DEP WEATHER · ${proof.departure.iata}`;
  const depWeatherMetrics = `WIND ${proof.departureWeather.windKt} KT · VIS ${proof.departureWeather.visibilityKm.toFixed(1)} KM · PRECIP ${proof.departureWeather.precipitationMm.toFixed(1)} MM`;
  const arrWeatherHeader = `ARR WEATHER · ${proof.arrival.iata}`;
  const arrWeatherMetrics = `WIND ${proof.arrivalWeather.windKt} KT · VIS ${proof.arrivalWeather.visibilityKm.toFixed(1)} KM · PRECIP ${proof.arrivalWeather.precipitationMm.toFixed(1)} MM`;
  const signerShort = primaryAttest
    ? `${primaryAttest.airnode.slice(0, 12)}...${primaryAttest.airnode.slice(-8)}`
    : "N/A";
  const attestedSources = `AERODATABOX + ${proof.departureWeather.provider.toUpperCase()}`;
  const modeLabel = `EIP-191 · ${proof.mode} TELEMETRY`;

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#111111",
          padding: px(28),
          fontFamily: "sans-serif",
        }}
      >
        {/* Perforated archival paper boarding pass */}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            backgroundColor: "#F3F1EA",
            color: "#121212",
            border: `${px(2)}px solid #2B2B2B`,
            position: "relative",
          }}
        >
          {/* Left Main Boarding Pass Section */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: `${px(26)}px ${px(30)}px`,
              borderRight: `${px(2)}px dashed #9E9B90`,
            }}
          >
            {/* Header Strip */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `${px(2)}px solid #121212`,
                paddingBottom: px(12),
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(12),
                    fontFamily: "monospace",
                    letterSpacing: "0.18em",
                    color: "#57554E",
                  }}
                >
                  {"SIGNED DELAY RECEIPT · CRYPTOGRAPHIC TELEMETRY"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: px(12),
                    marginTop: px(4),
                  }}
                >
                  <span style={{ fontSize: px(32), fontWeight: 700 }}>
                    {proof.flightNumber}
                  </span>
                  <span
                    style={{
                      fontSize: px(18),
                      color: "#3F3E39",
                      fontWeight: 600,
                    }}
                  >
                    {proof.airlineName.toUpperCase()}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  fontFamily: "monospace",
                }}
              >
                <div style={{ display: "flex", fontSize: px(11), color: "#57554E" }}>
                  {"FLIGHT DATE"}
                </div>
                <div style={{ display: "flex", fontSize: px(18), fontWeight: 700 }}>
                  {proof.flightDate}
                </div>
              </div>
            </div>

            {/* Route + Tilted Rubber Ink Stamp */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: px(14),
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: px(14),
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ fontSize: px(54), fontWeight: 700 }}>
                    {proof.departure.iata}
                  </span>
                  <span
                    style={{
                      fontSize: px(28),
                      color: "#57554E",
                      fontWeight: 700,
                    }}
                  >
                    {"->"}
                  </span>
                  <span style={{ fontSize: px(54), fontWeight: 700 }}>
                    {proof.arrival.iata}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(13),
                    fontFamily: "monospace",
                    color: "#57554E",
                    marginTop: px(2),
                  }}
                >
                  {routeSubline}
                </div>
              </div>

              {/* Tilted Rubber Ink Stamp */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: `${px(3)}px solid ${stampColor}`,
                  padding: `${px(10)}px ${px(16)}px`,
                  transform: "rotate(-4deg)",
                  color: stampColor,
                  backgroundColor: "rgba(243, 241, 234, 0.92)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: px(18),
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                  }}
                >
                  {proof.verdict.stampTitle}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(10),
                    fontFamily: "monospace",
                    letterSpacing: "0.14em",
                    marginTop: px(3),
                  }}
                >
                  {proof.verdict.stampSubtitle}
                </div>
              </div>
            </div>

            {/* Oversized Delay Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#121212",
                color: "#F3F1EA",
                padding: `${px(14)}px ${px(20)}px`,
                marginTop: px(14),
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(11),
                    fontFamily: "monospace",
                    color: "#A8A59B",
                    letterSpacing: "0.16em",
                  }}
                >
                  {delayBasisLabel}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(40),
                    fontWeight: 700,
                    color:
                      proof.verdict.delayStatus === "ON_TIME"
                        ? "#16A34A"
                        : "#F3F1EA",
                    lineHeight: 1.1,
                    marginTop: px(2),
                  }}
                >
                  {proof.verdict.delayFormatted}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  fontFamily: "monospace",
                }}
              >
                <div style={{ display: "flex", fontSize: px(11), color: "#A8A59B" }}>
                  {schedArrLabel}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(15),
                    fontWeight: 700,
                    color: "#F3F1EA",
                    marginTop: px(4),
                  }}
                >
                  {actualArrLabel}
                </div>
              </div>
            </div>

            {/* Airport Weather Telemetry Grid */}
            <div
              style={{
                display: "flex",
                gap: px(14),
                marginTop: px(14),
                fontFamily: "monospace",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  border: `${px(1)}px solid #121212`,
                  padding: `${px(10)}px ${px(14)}px`,
                }}
              >
                <div style={{ display: "flex", fontSize: px(11), color: "#57554E" }}>
                  {depWeatherHeader}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(15),
                    fontWeight: 700,
                    marginTop: px(4),
                  }}
                >
                  {proof.departureWeather.conditionLabel.toUpperCase()}
                </div>
                <div style={{ display: "flex", fontSize: px(12), marginTop: px(4) }}>
                  {depWeatherMetrics}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  border: `${px(1)}px solid #121212`,
                  padding: `${px(10)}px ${px(14)}px`,
                }}
              >
                <div style={{ display: "flex", fontSize: px(11), color: "#57554E" }}>
                  {arrWeatherHeader}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: px(15),
                    fontWeight: 700,
                    marginTop: px(4),
                  }}
                >
                  {proof.arrivalWeather.conditionLabel.toUpperCase()}
                </div>
                <div style={{ display: "flex", fontSize: px(12), marginTop: px(4) }}>
                  {arrWeatherMetrics}
                </div>
              </div>
            </div>

            {/* Statutory Claim & Disclaimer Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `${px(1)}px solid #B8B5AA`,
                paddingTop: px(10),
                marginTop: px(12),
                fontFamily: "monospace",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: px(14),
                  fontWeight: 700,
                  color: proof.verdict.compensation.eligible
                    ? "#D92D20"
                    : "#121212",
                }}
              >
                {proof.verdict.compensation.badgeText}
              </div>
              <div style={{ display: "flex", fontSize: px(10), color: "#57554E" }}>
                {triggerLine}
              </div>
            </div>
          </div>

          {/* Right Perforated Cryptographic Stub */}
          <div
            style={{
              width: px(255),
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: `${px(26)}px ${px(22)}px`,
              fontFamily: "monospace",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `${px(2)}px solid #16A34A`,
                  padding: `${px(6)}px ${px(10)}px`,
                  color: "#16A34A",
                }}
              >
                <span style={{ fontSize: px(12), fontWeight: 700 }}>
                  {"SIGNED VIA AIRNODEHUB"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: px(10),
                  color: "#57554E",
                  marginTop: px(16),
                }}
              >
                {"PROOF ID"}
              </div>
              <div style={{ display: "flex", fontSize: px(14), fontWeight: 700, marginTop: px(2) }}>
                {proof.id.toUpperCase()}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: px(10),
                  color: "#57554E",
                  marginTop: px(12),
                }}
              >
                {"AIRNODE SIGNER"}
              </div>
              <div style={{ display: "flex", fontSize: px(11), fontWeight: 600, marginTop: px(2) }}>
                {signerShort}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: px(10),
                  color: "#57554E",
                  marginTop: px(12),
                }}
              >
                {"SIGNATURE HASH"}
              </div>
              <div style={{ display: "flex", fontSize: px(11), fontWeight: 600, marginTop: px(2) }}>
                {proof.signatureDigestShort}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: px(10),
                  color: "#57554E",
                  marginTop: px(12),
                }}
              >
                {"ATTESTED SOURCES"}
              </div>
              <div style={{ display: "flex", fontSize: px(11), fontWeight: 600, marginTop: px(2) }}>
                {attestedSources}
              </div>
            </div>

            {/* Deterministic Signature Barcode */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  height: px(74),
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                {barcodeBars.map((bar, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      width: px(bar.width * 2.2),
                      height: "100%",
                      backgroundColor: bar.filled ? "#121212" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: px(10),
                  color: "#57554E",
                  marginTop: px(6),
                  letterSpacing: "0.08em",
                }}
              >
                {modeLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height }
  );

  if (isDownload) {
    img.headers.set(
      "Content-Disposition",
      `attachment; filename="delay-receipt-${proof.flightNumber}-${proof.flightDate}.png"`
    );
  }
  img.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");

  return img;
}
