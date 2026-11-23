import { formatUtcTime, generateDeterministicBarcode } from "./rules";
import type { FlightProofRecord } from "./types";

/**
 * Ultra-fast (< 4 ms CPU) 4-bit indexed-palette 1200x630 PNG Boarding Pass Renderer.
 * Built specifically to stay well inside Cloudflare Workers Free Plan's 10 ms CPU limit
 * without heavy resvg/harfbuzz WASM bundles, using native Web CompressionStream("deflate").
 */

// 16-color Swiss/Bauhaus archival palette (indices 0..15)
const PALETTE: Array<[number, number, number]> = [
  [17, 17, 17],    // 0: #111111 canvas black
  [18, 18, 18],    // 1: #121212 deep ink
  [43, 43, 43],    // 2: #2B2B2B grid border
  [87, 85, 78],    // 3: #57554E muted ink
  [158, 155, 144], // 4: #9E9B90 dashed perforation
  [184, 181, 170], // 5: #B8B5AA hairline / light muted
  [236, 233, 223], // 6: #ECE9DF stub / card surface
  [243, 241, 234], // 7: #F3F1EA archival paper
  [217, 45, 32],   // 8: #D92D20 signal red
  [22, 163, 74],   // 9: #16A34A terminal green
  [20, 83, 45],    // 10: #14532D dark green text
  [217, 119, 6],   // 11: #D97706 aviation amber
  [120, 53, 15],   // 12: #78350F dark amber text
  [230, 244, 234], // 13: soft green tint
  [254, 243, 199], // 14: soft amber tint
  [254, 226, 226], // 15: soft red tint
];

const C_CANVAS = 0;
const C_INK = 1;
const C_GRID = 2;
const C_MUTED = 3;
const C_DASH = 4;
const C_LIGHT = 5;
const C_STUB = 6;
const C_PAPER = 7;
const C_RED = 8;
const C_GREEN = 9;
const C_DARK_GREEN = 10;
const C_AMBER = 11;
const C_DARK_AMBER = 12;
const C_TINT_GREEN = 13;
const C_TINT_AMBER = 14;
const C_TINT_RED = 15;

// Crisp 5x7 monospace bitmap font (5 bits per row, 7 rows per glyph)
const FONT_5X7: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x12, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x08],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  ">": [0x10, 0x08, 0x04, 0x02, 0x04, 0x08, 0x10],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0e],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "|": [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  "·": [0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00],
  "'": [0x04, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00],
};

class IndexedCanvas {
  readonly width: number;
  readonly height: number;
  readonly stride: number; // bytes per row including filter byte (1 + width/2)
  readonly raw: Uint8Array;

  constructor(width: number, height: number, bgColor: number) {
    this.width = width;
    this.height = height;
    this.stride = 1 + (width >> 1);
    this.raw = new Uint8Array(this.stride * height);
    const pair = ((bgColor & 0xf) << 4) | (bgColor & 0xf);
    for (let y = 0; y < height; y++) {
      const rowStart = y * this.stride;
      this.raw[rowStart] = 0; // PNG filter type 0 (None)
      this.raw.fill(pair, rowStart + 1, rowStart + this.stride);
    }
  }

  setPixel(x: number, y: number, color: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.stride + 1 + (x >> 1);
    const cur = this.raw[idx];
    if ((x & 1) === 0) {
      this.raw[idx] = ((color & 0xf) << 4) | (cur & 0x0f);
    } else {
      this.raw[idx] = (cur & 0xf0) | (color & 0x0f);
    }
  }

  fillRect(x: number, y: number, w: number, h: number, color: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + w));
    const y1 = Math.min(this.height, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;

    const c = color & 0xf;
    const pair = (c << 4) | c;
    const evenStart = (x0 + 1) & ~1;
    const evenEnd = x1 & ~1;

    for (let row = y0; row < y1; row++) {
      const rowOffset = row * this.stride + 1;
      if ((x0 & 1) === 1 && x0 < x1) {
        const idx = rowOffset + (x0 >> 1);
        this.raw[idx] = (this.raw[idx] & 0xf0) | c;
      }
      if (evenStart < evenEnd) {
        this.raw.fill(pair, rowOffset + (evenStart >> 1), rowOffset + (evenEnd >> 1));
      }
      if ((x1 & 1) === 1 && evenEnd < x1) {
        const idx = rowOffset + (evenEnd >> 1);
        this.raw[idx] = (c << 4) | (this.raw[idx] & 0x0f);
      }
    }
  }

  strokeRect(
    x: number,
    y: number,
    w: number,
    h: number,
    thickness: number,
    color: number
  ): void {
    this.fillRect(x, y, w, thickness, color);
    this.fillRect(x, y + h - thickness, w, thickness, color);
    this.fillRect(x, y, thickness, h, color);
    this.fillRect(x + w - thickness, y, thickness, h, color);
  }

  fillCircle(cx: number, cy: number, r: number, color: number): void {
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const dxMax = Math.floor(Math.sqrt(r2 - dy * dy));
      this.fillRect(cx - dxMax, cy + dy, dxMax * 2 + 1, 1, color);
    }
  }

  drawText(
    text: string,
    x: number,
    y: number,
    scale: number,
    color: number,
    maxChars?: number
  ): number {
    const upper = text
      .toUpperCase()
      .replace(/[—–]/g, "-")
      .replace(/°/g, " ");
    const clipped =
      maxChars && upper.length > maxChars
        ? `${upper.slice(0, maxChars - 3)}...`
        : upper;

    let cursorX = Math.floor(x);
    const step = 6 * scale;

    for (let i = 0; i < clipped.length; i++) {
      const glyph = FONT_5X7[clipped[i]] || FONT_5X7[" "];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        if (!bits) continue;
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            this.fillRect(
              cursorX + col * scale,
              y + row * scale,
              scale,
              scale,
              color
            );
          }
        }
      }
      cursorX += step;
    }
    return cursorX - Math.floor(x);
  }

  measureText(text: string, scale: number): number {
    return text.length * 6 * scale - scale;
  }
}

// Precomputed CRC-32 table for PNG chunks
const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[n] = c >>> 0;
  }
  return tbl;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);
  return out;
}

async function zlibDeflate(input: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  await writer.write(copy);
  await writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return merged;
}

async function encodeIndexedPng(canvas: IndexedCanvas): Promise<Uint8Array> {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, canvas.width, false);
  ihdrView.setUint32(4, canvas.height, false);
  ihdrData[8] = 4; // 4-bit indexed palette
  ihdrData[9] = 3; // color type 3 (Indexed)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const plteData = new Uint8Array(PALETTE.length * 3);
  for (let i = 0; i < PALETTE.length; i++) {
    plteData[i * 3] = PALETTE[i][0];
    plteData[i * 3 + 1] = PALETTE[i][1];
    plteData[i * 3 + 2] = PALETTE[i][2];
  }

  const compressed = await zlibDeflate(canvas.raw);

  const chunks = [
    signature,
    makePngChunk("IHDR", ihdrData),
    makePngChunk("PLTE", plteData),
    makePngChunk("IDAT", compressed),
    makePngChunk("IEND", new Uint8Array(0)),
  ];

  const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const png = new Uint8Array(totalLen);
  let pos = 0;
  for (const ch of chunks) {
    png.set(ch, pos);
    pos += ch.byteLength;
  }
  return png;
}

export async function renderNotFoundOgPng(id: string): Promise<Uint8Array> {
  const c = new IndexedCanvas(1200, 630, C_CANVAS);
  c.strokeRect(24, 24, 1152, 582, 2, C_GRID);
  c.fillRect(48, 48, 12, 12, C_RED);
  c.drawText("DELAY RECEIPT · RECORD NOT FOUND", 74, 47, 2, C_RED);
  c.drawText(`PROOF ID: ${id.toUpperCase()}`, 48, 280, 5, C_PAPER, 28);
  c.drawText("API3 AIRNODEHUB CRYPTOGRAPHIC TELEMETRY", 48, 550, 2, C_MUTED);
  return encodeIndexedPng(c);
}

export async function renderBoardingPassOgPng(
  proof: FlightProofRecord
): Promise<Uint8Array> {
  const W = 1200;
  const H = 630;
  const c = new IndexedCanvas(W, H, C_CANVAS);

  const pad = 24;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2; // 1152
  const cardH = H - pad * 2; // 582
  const stubW = 280;
  const mainW = cardW - stubW; // 872
  const perfX = cardX + mainW; // 896

  // Archival paper + stub surface
  c.fillRect(cardX, cardY, mainW, cardH, C_PAPER);
  c.fillRect(perfX, cardY, stubW, cardH, C_STUB);
  c.strokeRect(cardX, cardY, cardW, cardH, 2, C_GRID);

  // Top dark header strip
  const topBarH = 36;
  c.fillRect(cardX, cardY, cardW, topBarH, C_INK);
  c.fillRect(cardX + 20, cardY + 13, 10, 10, C_RED);
  c.drawText(
    "SIGNED BOARDING PASS · FLIGHT DELAY PROOF RECEIPT",
    cardX + 38,
    cardY + 11,
    2,
    C_PAPER
  );
  const recLabel = `#${proof.id.toUpperCase()} · ${proof.mode}`;
  const recW = c.measureText(recLabel, 2);
  c.drawText(recLabel, cardX + cardW - recW - 18, cardY + 11, 2, C_LIGHT);

  // Perforated dashed divider + semicircular notches
  for (let y = cardY + topBarH + 6; y < cardY + cardH - 6; y += 14) {
    c.fillRect(perfX - 1, y, 2, 7, C_DASH);
  }
  c.fillCircle(perfX, cardY + topBarH, 11, C_CANVAS);
  c.fillCircle(perfX, cardY + cardH, 11, C_CANVAS);

  // Left main pass layout
  const mx = cardX + 26;
  const mw = mainW - 52; // 820

  // Row 1: Flight number, airline, date
  c.drawText(
    `OPERATING CARRIER · ${proof.airlineHandle}`,
    mx,
    cardY + 52,
    2,
    C_MUTED,
    46
  );
  const fnWidth = c.drawText(proof.flightNumber, mx, cardY + 74, 5, C_INK, 10);
  c.drawText(
    proof.airlineName,
    mx + fnWidth + 16,
    cardY + 86,
    3,
    C_MUTED,
    20
  );

  const dateW = c.measureText(proof.flightDate, 3);
  c.drawText("FLIGHT DATE", mx + mw - c.measureText("FLIGHT DATE", 2), cardY + 52, 2, C_MUTED);
  c.drawText(proof.flightDate, mx + mw - dateW, cardY + 76, 3, C_INK);

  // Hairline rule
  c.fillRect(mx, cardY + 118, mw, 2, C_LIGHT);

  // Row 2: Route + Rubber Stamp Box
  c.drawText(
    `ROUTE · ${proof.verdict.compensation.distanceKm.toLocaleString("en-US")} KM GREAT-CIRCLE`,
    mx,
    cardY + 132,
    2,
    C_MUTED
  );
  c.drawText(
    `${proof.departure.iata} -> ${proof.arrival.iata}`,
    mx,
    cardY + 154,
    6,
    C_INK
  );
  c.drawText(
    `${proof.departure.municipality} TO ${proof.arrival.municipality}`,
    mx,
    cardY + 206,
    2,
    C_MUTED,
    34
  );

  // Stamp box on right of Route row
  const stampColor =
    proof.verdict.stampTone === "red"
      ? C_RED
      : proof.verdict.stampTone === "green"
        ? C_GREEN
        : C_AMBER;
  const stampBg =
    proof.verdict.stampTone === "red"
      ? C_TINT_RED
      : proof.verdict.stampTone === "green"
        ? C_TINT_GREEN
        : C_TINT_AMBER;

  const stampTitle = proof.verdict.stampTitle;
  const stampScale = stampTitle.length > 26 ? 2 : 2;
  const stampW = Math.min(390, Math.max(290, c.measureText(stampTitle, stampScale) + 32));
  const stampH = 66;
  const stampX = mx + mw - stampW;
  const stampY = cardY + 144;
  c.fillRect(stampX, stampY, stampW, stampH, stampBg);
  c.strokeRect(stampX, stampY, stampW, stampH, 4, stampColor);
  c.strokeRect(stampX + 6, stampY + 6, stampW - 12, stampH - 12, 1, stampColor);
  const stTw = c.measureText(stampTitle, stampScale);
  c.drawText(
    stampTitle,
    stampX + Math.max(12, Math.floor((stampW - stTw) / 2)),
    stampY + 16,
    stampScale,
    stampColor,
    30
  );
  const subTxt = proof.verdict.stampSubtitle.slice(0, 32);
  const subW = c.measureText(subTxt, 1) * 1;
  c.drawText(
    subTxt,
    stampX + Math.max(12, Math.floor((stampW - subW) / 2)),
    stampY + 44,
    1,
    stampColor
  );

  // Row 3: Oversized Dark Delay Banner
  const banY = cardY + 232;
  const banH = 88;
  c.fillRect(mx, banY, mw, banH, C_INK);
  const basisLabel =
    proof.verdict.delayBasis === "CANCELLED"
      ? "VERIFIED FLIGHT CANCELLATION"
      : proof.verdict.delayBasis === "DEPARTURE_DELAY"
        ? "VERIFIED DEPARTURE DELAY"
        : "VERIFIED ARRIVAL DELAY";
  c.drawText(basisLabel, mx + 18, banY + 12, 2, C_LIGHT);
  const delayColor =
    proof.verdict.delayStatus === "ON_TIME"
      ? C_GREEN
      : proof.verdict.delayStatus === "CANCELLED"
        ? C_RED
        : C_PAPER;
  c.drawText(proof.verdict.delayFormatted, mx + 18, banY + 38, 5, delayColor, 18);

  const schedLabel = `SCHED ARR: ${formatUtcTime(proof.scheduledArrivalUtc)}`;
  const actLabel = `ACTUAL ARR: ${proof.verdict.delayStatus === "CANCELLED" ? "CANCELLED" : formatUtcTime(proof.actualArrivalUtc)}`;
  c.drawText(
    schedLabel,
    mx + mw - c.measureText(schedLabel, 2) - 18,
    banY + 22,
    2,
    C_LIGHT
  );
  c.drawText(
    actLabel,
    mx + mw - c.measureText(actLabel, 2) - 18,
    banY + 52,
    2,
    C_PAPER
  );

  // Row 4: Departure & Arrival Weather Telemetry Panels
  const wY = cardY + 334;
  const wH = 112;
  const wGap = 16;
  const wW = Math.floor((mw - wGap) / 2);

  const weatherPanels = [
    { x: mx, tag: `DEP WEATHER · ${proof.departure.iata}`, snap: proof.departureWeather },
    { x: mx + wW + wGap, tag: `ARR WEATHER · ${proof.arrival.iata}`, snap: proof.arrivalWeather },
  ];

  for (const p of weatherPanels) {
    c.fillRect(p.x, wY, wW, wH, C_STUB);
    c.strokeRect(p.x, wY, wW, wH, 2, C_INK);
    c.drawText(p.tag, p.x + 14, wY + 12, 2, C_MUTED, 28);
    c.drawText(
      `${p.snap.conditionLabel} (${p.snap.temperatureC}C)`,
      p.x + 14,
      wY + 36,
      2,
      C_INK,
      28
    );
    c.drawText(
      `WIND ${p.snap.windKt} KT · GUST ${p.snap.gustKt} KT`,
      p.x + 14,
      wY + 62,
      2,
      C_INK,
      28
    );
    c.drawText(
      `VIS ${p.snap.visibilityKm.toFixed(1)} KM · PRECIP ${p.snap.precipitationMm.toFixed(1)} MM`,
      p.x + 14,
      wY + 86,
      2,
      C_MUTED,
      28
    );
  }

  // Row 5: Weather Trigger Audit Strip
  const trigY = cardY + 460;
  const trigH = 34;
  const isClear = proof.verdict.weatherVerdict === "NOT_WEATHER";
  c.fillRect(mx, trigY, mw, trigH, isClear ? C_TINT_GREEN : C_TINT_AMBER);
  c.strokeRect(mx, trigY, mw, trigH, 1, isClear ? C_GREEN : C_AMBER);
  c.drawText(
    proof.verdict.weatherTriggerReason || proof.verdict.weatherSummary,
    mx + 12,
    trigY + 10,
    2,
    isClear ? C_DARK_GREEN : C_DARK_AMBER,
    64
  );

  // Row 6: Compensation Badge + Legal Disclaimer
  const compY = cardY + 510;
  c.drawText(
    proof.verdict.compensation.badgeText,
    mx,
    compY,
    2,
    proof.verdict.compensation.eligible ? C_RED : C_INK,
    56
  );
  c.drawText(
    proof.verdict.disclaimer,
    mx,
    compY + 28,
    1,
    C_MUTED,
    110
  );

  // RIGHT CRYPTOGRAPHIC STUB
  const sx = perfX + 20;
  const sw = stubW - 40; // 240
  const primary = proof.attestations[0];

  c.fillRect(sx, cardY + 52, sw, 48, C_TINT_GREEN);
  c.strokeRect(sx, cardY + 52, sw, 48, 2, C_GREEN);
  c.drawText("SIGNED VIA AIRNODEHUB", sx + 12, cardY + 64, 1, C_GREEN);
  c.drawText("SIGNED VIA AIRNODEHUB", sx + 13, cardY + 64, 1, C_GREEN);
  c.drawText(
    `EIP-191 · ${proof.attestations.length} SOURCES`,
    sx + 12,
    cardY + 82,
    1,
    C_DARK_GREEN
  );

  const signerShort = primary
    ? `${primary.airnode.slice(0, 10)}...${primary.airnode.slice(-8)}`
    : "N/A";

  const stubMeta = [
    { label: "PROOF ID", val: proof.id.toUpperCase() },
    { label: "AIRNODE SIGNER", val: signerShort },
    { label: "SIGNATURE HASH", val: proof.signatureDigestShort },
    { label: "SIGNED UTC", val: proof.createdAtUtc.replace("T", " ").slice(0, 16) },
    { label: "SOURCES", val: `AERODATABOX + ${proof.departureWeather.provider}` },
  ];

  let curY = cardY + 118;
  for (const m of stubMeta) {
    c.drawText(m.label, sx, curY, 1, C_MUTED);
    c.drawText(m.val, sx, curY + 14, 2, C_INK, 19);
    curY += 54;
  }

  // Deterministic Signature Hash Barcode
  const bars = generateDeterministicBarcode(primary?.signature || proof.id, 44);
  const bcY = cardY + cardH - 122;
  const bcH = 74;
  c.fillRect(sx, bcY, sw, bcH, C_PAPER);
  c.strokeRect(sx, bcY, sw, bcH, 1, C_LIGHT);

  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);
  const unitPx = (sw - 12) / totalUnits;
  let bx = sx + 6;
  for (const bar of bars) {
    const bw = Math.max(1, Math.round(bar.width * unitPx));
    if (bar.filled) {
      c.fillRect(bx, bcY + 6, bw, bcH - 12, C_INK);
    }
    bx += bar.width * unitPx;
  }

  c.drawText(
    `${proof.flightNumber} · ${proof.departure.iata}/${proof.arrival.iata} · ${proof.mode}`,
    sx,
    bcY + bcH + 12,
    1,
    C_MUTED,
    36
  );

  return encodeIndexedPng(c);
}
