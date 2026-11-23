"use client";

import { formatUtcTime, generateDeterministicBarcode } from "./rules";
import type { FlightProofRecord } from "./types";

/**
 * Generates a crisp 1600x840 archival-paper Boarding Pass PNG directly in the browser
 * (0 ms server/Worker CPU — ideal for Cloudflare Workers Free plan & instant downloads).
 */
export async function downloadBoardingPassPngClient(
  proof: FlightProofRecord
): Promise<void> {
  const W = 1600;
  const H = 840;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const mono = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  const sans = '"Space Grotesk", Inter, system-ui, -apple-system, sans-serif';

  // Outer canvas dark frame
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, H);

  const pad = 34;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;
  const stubW = 350;
  const mainW = cardW - stubW;
  const perfX = cardX + mainW;

  // Archival paper base
  ctx.fillStyle = "#F3F1EA";
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Subtle right stub tint
  ctx.fillStyle = "#ECE9DF";
  ctx.fillRect(perfX, cardY, stubW, cardH);

  // Card outer border
  ctx.strokeStyle = "#2B2B2B";
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  // Top dark receipt bar
  const barH = 44;
  ctx.fillStyle = "#121212";
  ctx.fillRect(cardX, cardY, cardW, barH);
  ctx.fillStyle = "#D92D20";
  ctx.fillRect(cardX + 28, cardY + 17, 10, 10);
  ctx.fillStyle = "#F3F1EA";
  ctx.font = `700 14px ${mono}`;
  ctx.fillText(
    "SIGNED BOARDING PASS · FLIGHT DELAY PROOF RECEIPT",
    cardX + 48,
    cardY + 27
  );
  ctx.fillStyle = "#A8A59B";
  ctx.textAlign = "right";
  ctx.fillText(
    `RECORD #${proof.id.toUpperCase()} · ${proof.mode}`,
    cardX + cardW - 28,
    cardY + 27
  );
  ctx.textAlign = "left";

  // Perforated vertical divider + notches
  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = "#9E9B90";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(perfX, cardY + barH);
  ctx.lineTo(perfX, cardY + cardH);
  ctx.stroke();
  ctx.restore();

  for (const ny of [cardY + barH, cardY + cardH]) {
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(perfX, ny, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main section coordinates
  const mx = cardX + 36;
  const mw = mainW - 72;

  // Row 1: Carrier + Flight + Date
  ctx.fillStyle = "#57554E";
  ctx.font = `600 13px ${mono}`;
  ctx.fillText(`OPERATING CARRIER · ${proof.airlineHandle}`, mx, cardY + 82);

  ctx.fillStyle = "#121212";
  ctx.font = `700 44px ${mono}`;
  ctx.fillText(proof.flightNumber, mx, cardY + 130);
  const flightW = ctx.measureText(proof.flightNumber).width;
  ctx.fillStyle = "#3F3E39";
  ctx.font = `600 24px ${sans}`;
  ctx.fillText(proof.airlineName.toUpperCase(), mx + flightW + 18, cardY + 126);

  ctx.textAlign = "right";
  ctx.fillStyle = "#57554E";
  ctx.font = `600 13px ${mono}`;
  ctx.fillText("FLIGHT DATE · AIRCRAFT", mx + mw, cardY + 82);
  ctx.fillStyle = "#121212";
  ctx.font = `700 22px ${mono}`;
  ctx.fillText(proof.flightDate, mx + mw, cardY + 112);
  ctx.fillStyle = "#57554E";
  ctx.font = `500 14px ${mono}`;
  ctx.fillText(proof.aircraftModel, mx + mw, cardY + 134);
  ctx.textAlign = "left";

  // Hairline divider
  ctx.strokeStyle = "#CFCBC0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx, cardY + 154);
  ctx.lineTo(mx + mw, cardY + 154);
  ctx.stroke();

  // Row 2: Route + Tilted Stamp
  ctx.fillStyle = "#57554E";
  ctx.font = `600 13px ${mono}`;
  ctx.fillText(
    `ROUTE · GREAT-CIRCLE ${proof.verdict.compensation.distanceKm.toLocaleString("en-US")} KM`,
    mx,
    cardY + 184
  );
  ctx.fillStyle = "#121212";
  ctx.font = `700 70px ${mono}`;
  ctx.fillText(`${proof.departure.iata} -> ${proof.arrival.iata}`, mx, cardY + 252);
  ctx.fillStyle = "#57554E";
  ctx.font = `500 15px ${mono}`;
  ctx.fillText(
    `${proof.departure.municipality.toUpperCase()} (${proof.departure.icao}) TO ${proof.arrival.municipality.toUpperCase()} (${proof.arrival.icao})`,
    mx,
    cardY + 280
  );

  // Tilted ink stamp
  const stampColor =
    proof.verdict.stampTone === "red"
      ? "#D92D20"
      : proof.verdict.stampTone === "green"
        ? "#16A34A"
        : "#D97706";

  ctx.save();
  ctx.translate(mx + mw - 195, cardY + 225);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.font = `700 22px ${mono}`;
  const titleW = ctx.measureText(proof.verdict.stampTitle).width;
  const boxW = Math.max(300, titleW + 44);
  const boxH = 74;
  ctx.fillStyle = "rgba(243, 241, 234, 0.94)";
  ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
  ctx.lineWidth = 1;
  ctx.strokeRect(-boxW / 2 + 5, -boxH / 2 + 5, boxW - 10, boxH - 10);
  ctx.fillStyle = stampColor;
  ctx.textAlign = "center";
  ctx.fillText(proof.verdict.stampTitle, 0, -4);
  ctx.font = `600 12px ${mono}`;
  ctx.fillText(proof.verdict.stampSubtitle, 0, 20);
  ctx.restore();
  ctx.textAlign = "left";

  // Row 3: Oversized Delay Banner
  const bannerY = cardY + 306;
  const bannerH = 114;
  ctx.fillStyle = "#121212";
  ctx.fillRect(mx, bannerY, mw, bannerH);

  ctx.fillStyle = "#A8A59B";
  ctx.font = `600 13px ${mono}`;
  const basisLabel =
    proof.verdict.delayBasis === "CANCELLED"
      ? "VERIFIED FLIGHT CANCELLATION"
      : proof.verdict.delayBasis === "DEPARTURE_DELAY"
        ? "VERIFIED DEPARTURE DELAY"
        : "VERIFIED ARRIVAL DELAY";
  ctx.fillText(basisLabel, mx + 24, bannerY + 30);

  ctx.fillStyle =
    proof.verdict.delayStatus === "ON_TIME"
      ? "#16A34A"
      : proof.verdict.delayStatus === "CANCELLED"
        ? "#D92D20"
        : "#F3F1EA";
  ctx.font = `700 54px ${sans}`;
  ctx.fillText(proof.verdict.delayFormatted, mx + 24, bannerY + 90);

  ctx.textAlign = "right";
  ctx.fillStyle = "#A8A59B";
  ctx.font = `500 15px ${mono}`;
  ctx.fillText(
    `SCHED ARR: ${formatUtcTime(proof.scheduledArrivalUtc)}`,
    mx + mw - 24,
    bannerY + 46
  );
  ctx.fillStyle = "#F3F1EA";
  ctx.font = `700 20px ${mono}`;
  ctx.fillText(
    `ACTUAL ARR: ${proof.verdict.delayStatus === "CANCELLED" ? "CANCELLED" : formatUtcTime(proof.actualArrivalUtc)}`,
    mx + mw - 24,
    bannerY + 80
  );
  ctx.textAlign = "left";

  // Row 4: Departure & Arrival Weather Cards
  const wY = cardY + 442;
  const wH = 148;
  const wGap = 20;
  const wW = (mw - wGap) / 2;

  const weatherPanels = [
    { x: mx, title: `DEPARTURE METEOROLOGY · ${proof.departure.iata}`, snap: proof.departureWeather },
    { x: mx + wW + wGap, title: `ARRIVAL METEOROLOGY · ${proof.arrival.iata}`, snap: proof.arrivalWeather },
  ];

  for (const panel of weatherPanels) {
    ctx.fillStyle = "#ECE9DF";
    ctx.fillRect(panel.x, wY, wW, wH);
    ctx.strokeStyle = "#121212";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panel.x, wY, wW, wH);

    ctx.fillStyle = "#57554E";
    ctx.font = `600 13px ${mono}`;
    ctx.fillText(panel.title, panel.x + 18, wY + 28);

    ctx.fillStyle = "#121212";
    ctx.font = `700 20px ${mono}`;
    ctx.fillText(
      `${panel.snap.conditionLabel.toUpperCase()} (${panel.snap.temperatureC}°C)`,
      panel.x + 18,
      wY + 60
    );

    ctx.font = `600 16px ${mono}`;
    ctx.fillText(
      `WIND ${panel.snap.windKt} KT (GUST ${panel.snap.gustKt} KT) · VIS ${panel.snap.visibilityKm.toFixed(1)} KM`,
      panel.x + 18,
      wY + 96
    );

    ctx.fillStyle = "#57554E";
    ctx.font = `500 13px ${mono}`;
    ctx.fillText(
      `PRECIP ${panel.snap.precipitationMm.toFixed(1)} MM · ${panel.snap.observedWindowUtc}`,
      panel.x + 18,
      wY + 126
    );
  }

  // Trigger reason strip
  const trigY = cardY + 608;
  const trigText =
    proof.verdict.weatherTriggerReason || proof.verdict.weatherSummary;
  ctx.fillStyle =
    proof.verdict.weatherVerdict === "NOT_WEATHER"
      ? "rgba(22, 163, 74, 0.12)"
      : "rgba(217, 119, 6, 0.14)";
  ctx.fillRect(mx, trigY, mw, 36);
  ctx.strokeStyle =
    proof.verdict.weatherVerdict === "NOT_WEATHER" ? "#16A34A" : "#D97706";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, trigY, mw, 36);
  ctx.fillStyle = "#121212";
  ctx.font = `600 14px ${mono}`;
  ctx.fillText(trigText.slice(0, 96), mx + 14, trigY + 23);

  // Statutory claim + Disclaimer footer
  const footY = cardY + 668;
  ctx.fillStyle = proof.verdict.compensation.eligible ? "#D92D20" : "#121212";
  ctx.font = `700 20px ${mono}`;
  ctx.fillText(proof.verdict.compensation.badgeText, mx, footY + 22);

  ctx.fillStyle = "#57554E";
  ctx.font = `500 13px ${mono}`;
  ctx.fillText(proof.verdict.disclaimer, mx, footY + 50);

  // RIGHT CRYPTOGRAPHIC STUB
  const sx = perfX + 28;
  const sw = stubW - 56;
  const primary = proof.attestations[0];

  ctx.fillStyle = "rgba(22, 163, 74, 0.12)";
  ctx.fillRect(sx, cardY + 72, sw, 56);
  ctx.strokeStyle = "#16A34A";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(sx, cardY + 72, sw, 56);
  ctx.fillStyle = "#16A34A";
  ctx.font = `700 16px ${mono}`;
  ctx.fillText("SIGNED VIA AIRNODEHUB", sx + 16, cardY + 98);
  ctx.fillStyle = "#14532D";
  ctx.font = `600 12px ${mono}`;
  ctx.fillText(
    `EIP-191 · ${proof.attestations.length} ATTESTATIONS`,
    sx + 16,
    cardY + 118
  );

  const metaRows = [
    { label: "PROOF ID", val: proof.id.toUpperCase() },
    {
      label: "AIRNODE SIGNER",
      val: primary
        ? `${primary.airnode.slice(0, 14)}...${primary.airnode.slice(-10)}`
        : "N/A",
    },
    { label: "SIGNATURE DIGEST", val: proof.signatureDigestShort },
    {
      label: "SIGNED UTC",
      val: `${proof.createdAtUtc.replace("T", " ").slice(0, 19)} UTC`,
    },
    {
      label: "SOURCES",
      val: `AERODATABOX + ${proof.departureWeather.provider.toUpperCase()}`,
    },
  ];

  let curY = cardY + 164;
  for (const row of metaRows) {
    ctx.fillStyle = "#57554E";
    ctx.font = `600 12px ${mono}`;
    ctx.fillText(row.label, sx, curY);
    ctx.fillStyle = "#121212";
    ctx.font = `700 15px ${mono}`;
    ctx.fillText(row.val, sx, curY + 22);
    curY += 68;
  }

  // Deterministic Signature Barcode
  const bars = generateDeterministicBarcode(primary?.signature || proof.id, 48);
  const bcY = cardY + cardH - 150;
  const bcH = 92;
  ctx.fillStyle = "#F3F1EA";
  ctx.fillRect(sx, bcY, sw, bcH);
  ctx.strokeStyle = "#B8B5AA";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, bcY, sw, bcH);

  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);
  const unitPx = (sw - 16) / totalUnits;
  let bx = sx + 8;
  for (const bar of bars) {
    const bw = bar.width * unitPx;
    if (bar.filled) {
      ctx.fillStyle = "#121212";
      ctx.fillRect(bx, bcY + 8, Math.max(1.5, bw), bcH - 16);
    }
    bx += bw;
  }

  ctx.fillStyle = "#57554E";
  ctx.font = `600 12px ${mono}`;
  ctx.fillText(
    `${proof.flightNumber} · ${proof.departure.iata}/${proof.arrival.iata} · ${proof.mode}`,
    sx,
    bcY + bcH + 22
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Failed to encode PNG");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `delay-receipt-${proof.flightNumber}-${proof.flightDate}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
