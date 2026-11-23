import { privateKeyToAccount } from "viem/accounts";
import { getAirlineProfile, normalizeFlightNumber } from "./airlines";
import { getServerSecret } from "./cfEnv";
import {
  computeAirnodeDigest,
  computeAirnodeRequestHash,
} from "./crypto";
import {
  buildDelayVerdict,
  computeDelay,
  describeWmoCode,
  isSevereConditionText,
} from "./rules";
import type {
  AirnodeAttestationRecord,
  AirportInfo,
  AirportWeatherSnapshot,
  DataMode,
  FlightProofRecord,
} from "./types";

/** Pure Web Standard UTF-8 safe Base64 helpers (compatible with Cloudflare Workers & Node.js) */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function randomHexBytes32(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return `0x${Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Live AirnodeHub Registry constants verified directly from:
 * - https://airnodehub.api3.org/llms.txt
 * - https://airnodes.api3.org/aerodatabox/
 * - https://airnodes.api3.org/open-meteo/
 * - https://airnodes.api3.org/visualcrossing/
 * - https://airnodes.api3.org/weatherapi/
 */
export const AIRNODE_LISTINGS = {
  aerodatabox: {
    slug: "aerodatabox",
    name: "AeroDataBox",
    url: "https://airnodes.api3.org/aerodatabox/",
    airnode: "0x83FE2E8F24E66520B1902C3507De4F471248f2Ec" as `0x${string}`,
    prices: {
      flightStatusOnDate: 0.05,
      flightStatus: 0.05,
      airport: 0.02,
    },
  },
  openMeteo: {
    slug: "open-meteo",
    name: "Open-Meteo",
    url: "https://airnodes.api3.org/open-meteo/",
    airnode: "0xee510FFb986299529fE987bfD163D6c89067D767" as `0x${string}`,
    prices: {
      forecast: 0.02,
      historicalForecast: 0.1,
      historicalWeather: 0.1,
    },
  },
  visualCrossing: {
    slug: "visualcrossing",
    name: "Visual Crossing",
    url: "https://airnodes.api3.org/visualcrossing/",
    airnode: "0xc86c050c80474c9756437Ee2026FfF093f20f479" as `0x${string}`,
    prices: {
      getForecast: 0.02,
      getTimelinePeriod: 0.5,
    },
  },
  weatherApi: {
    slug: "weatherapi",
    name: "WeatherAPI.com",
    url: "https://airnodes.api3.org/weatherapi/",
    airnode: "0x3B278A164e778C5A3Db606246d789973714121b2" as `0x${string}`,
    prices: {
      getCurrentWeather: 0.01,
      getForecast: 0.01,
      getHistory: 0.01,
    },
  },
} as const;

export const AIRNODEHUB_PAYMENT_NETWORK = "eip155:84532";
export const AIRNODEHUB_AUSD_ASSET =
  "0xbeA34973e5f67F18F656A2C6070C64326C791808" as `0x${string}`;

/** Deterministic local signer for DEMO_MODE=true (standard public test key, never holds real funds) */
const DEMO_SIGNER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

export function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE;
  if (flag === undefined || flag === "") return true;
  return flag.toLowerCase() === "true" || flag === "1";
}

interface X402AcceptEntry {
  scheme: string;
  network: string;
  amount: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  maxTimeoutSeconds?: number;
  extra?: {
    name?: string;
    version?: string;
  };
}

interface X402Requirements {
  x402Version: number;
  error?: string;
  accepts: X402AcceptEntry[];
}

interface AirnodeEnvelopeResponse {
  airnode: `0x${string}`;
  requestHash: `0x${string}`;
  timestamp: string;
  data: string;
  signature: `0x${string}`;
}

/**
 * Executes a live AirnodeHub POST / operation with automatic x402 v2 EIP-3009 aUSD payment.
 */
async function callLiveAirnodeOperation(params: {
  listing: {
    slug: string;
    name: string;
    url: string;
    airnode: `0x${string}`;
  };
  role: AirnodeAttestationRecord["role"];
  operation: string;
  parameters: Record<string, unknown>;
  maxPriceUsd: number;
}): Promise<{
  record: AirnodeAttestationRecord;
  parsedData: unknown;
}> {
  const body = JSON.stringify({
    operation: params.operation,
    parameters: params.parameters,
  });

  let response = await fetch(params.listing.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  let paidUsd = 0;
  let settlementTx: string | null = null;

  if (response.status === 402) {
    const reqHeader = response.headers.get("payment-required");
    if (!reqHeader) {
      throw new Error(
        `Airnode ${params.listing.slug} returned 402 without PAYMENT-REQUIRED header.`
      );
    }

    const decoded = JSON.parse(base64ToUtf8(reqHeader)) as X402Requirements;

    const entry =
      decoded.accepts.find(
        (a) =>
          a.scheme === "exact" &&
          a.network === AIRNODEHUB_PAYMENT_NETWORK &&
          a.asset.toLowerCase() === AIRNODEHUB_AUSD_ASSET.toLowerCase()
      ) ?? decoded.accepts[0];

    if (!entry) {
      throw new Error(
        `No compatible x402 payment option returned by ${params.listing.slug}.`
      );
    }

    const priceUsd = Number(entry.amount) / 1_000_000;
    if (priceUsd > params.maxPriceUsd) {
      throw new Error(
        `Operation ${params.listing.slug}:${params.operation} costs $${priceUsd.toFixed(4)} aUSD, exceeding budget cap $${params.maxPriceUsd.toFixed(2)}.`
      );
    }

    const privateKey = await getServerSecret("AIRNODEHUB_WALLET_PRIVATE_KEY");
    if (!privateKey) {
      throw new Error(
        "AIRNODEHUB_WALLET_PRIVATE_KEY is required when DEMO_MODE=false to pay x402 aUSD micropayments."
      );
    }

    const normalizedKey = (
      privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
    ) as `0x${string}`;
    const account = privateKeyToAccount(normalizedKey);

    const nowSec = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(nowSec - 60);
    const validBefore = BigInt(nowSec + (entry.maxTimeoutSeconds ?? 300));
    const nonce = randomHexBytes32();
    const chainId = Number(entry.network.split(":")[1] || "84532");

    const signature = await account.signTypedData({
      domain: {
        name: entry.extra?.name || "AirnodeHub USD",
        version: entry.extra?.version || "1",
        chainId,
        verifyingContract: entry.asset,
      },
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "TransferWithAuthorization",
      message: {
        from: account.address,
        to: entry.payTo,
        value: BigInt(entry.amount),
        validAfter,
        validBefore,
        nonce,
      },
    });

    const paymentPayload = {
      x402Version: 2,
      accepted: entry,
      payload: {
        signature,
        authorization: {
          from: account.address,
          to: entry.payTo,
          value: entry.amount,
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    };

    const paymentHeader = utf8ToBase64(JSON.stringify(paymentPayload));

    response = await fetch(params.listing.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "PAYMENT-SIGNATURE": paymentHeader,
      },
      body,
      cache: "no-store",
    });

    paidUsd = priceUsd;
    const payRespHeader = response.headers.get("payment-response");
    if (payRespHeader) {
      try {
        const receipt = JSON.parse(base64ToUtf8(payRespHeader)) as {
          transaction?: string;
          txHash?: string;
        };
        settlementTx = receipt.transaction || receipt.txHash || null;
      } catch {
        settlementTx = null;
      }
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Airnode ${params.listing.slug}:${params.operation} failed (${response.status}): ${errText.slice(0, 260)}`
    );
  }

  const envelope = (await response.json()) as AirnodeEnvelopeResponse;
  if (
    envelope.airnode.toLowerCase() !== params.listing.airnode.toLowerCase()
  ) {
    throw new Error(
      `Signer mismatch for ${params.listing.slug}: expected ${params.listing.airnode}, got ${envelope.airnode}.`
    );
  }

  const trimmedData = (envelope.data || "").trim();
  let parsedData: unknown = null;
  if (trimmedData.length > 0) {
    try {
      parsedData = JSON.parse(trimmedData);
    } catch {
      throw new Error(
        `Upstream provider ${params.listing.name} returned non-JSON payload for ${params.operation}.`
      );
    }
  }

  return {
    parsedData,
    record: {
      id: `${params.role}-${params.listing.slug}`,
      role: params.role,
      providerSlug: params.listing.slug,
      providerName: params.listing.name,
      listingUrl: params.listing.url,
      operation: params.operation,
      parameters: params.parameters,
      airnode: envelope.airnode,
      requestHash: envelope.requestHash,
      timestamp: envelope.timestamp,
      data: envelope.data,
      signature: envelope.signature,
      priceUsd: paidUsd,
      settlementTx,
      isDemoSigner: false,
    },
  };
}

/** Built-in reference coordinates for major international hubs (fallback if upstream omits lat/lon) */
const AIRPORT_FALLBACK_COORDS: Record<string, AirportInfo> = {
  FRA: { iata: "FRA", icao: "EDDF", name: "Frankfurt Airport", municipality: "Frankfurt", countryCode: "DE", lat: 50.033333, lon: 8.570556 },
  JFK: { iata: "JFK", icao: "KJFK", name: "John F. Kennedy Intl", municipality: "New York", countryCode: "US", lat: 40.63975, lon: -73.778925 },
  STN: { iata: "STN", icao: "EGSS", name: "London Stansted", municipality: "London", countryCode: "GB", lat: 51.885, lon: 0.235 },
  BCN: { iata: "BCN", icao: "LEBL", name: "Barcelona El Prat", municipality: "Barcelona", countryCode: "ES", lat: 41.2971, lon: 2.07846 },
  IST: { iata: "IST", icao: "LTFM", name: "Istanbul Airport", municipality: "Istanbul", countryCode: "TR", lat: 41.275278, lon: 28.751944 },
  AMS: { iata: "AMS", icao: "EHAM", name: "Amsterdam Schiphol", municipality: "Amsterdam", countryCode: "NL", lat: 52.3086, lon: 4.76389 },
  LHR: { iata: "LHR", icao: "EGLL", name: "London Heathrow", municipality: "London", countryCode: "GB", lat: 51.4706, lon: -0.461941 },
  MAD: { iata: "MAD", icao: "LEMD", name: "Madrid Barajas", municipality: "Madrid", countryCode: "ES", lat: 40.471926, lon: -3.56264 },
  SFO: { iata: "SFO", icao: "KSFO", name: "San Francisco Intl", municipality: "San Francisco", countryCode: "US", lat: 37.618972, lon: -122.374889 },
  CDG: { iata: "CDG", icao: "LFPG", name: "Paris Charles de Gaulle", municipality: "Paris", countryCode: "FR", lat: 49.012798, lon: 2.55 },
  DXB: { iata: "DXB", icao: "OMDB", name: "Dubai Intl", municipality: "Dubai", countryCode: "AE", lat: 25.2528, lon: 55.3644 },
  DOH: { iata: "DOH", icao: "OTHH", name: "Hamad Intl", municipality: "Doha", countryCode: "QA", lat: 25.2731, lon: 51.6081 },
  MUC: { iata: "MUC", icao: "EDDM", name: "Munich Airport", municipality: "Munich", countryCode: "DE", lat: 48.3538, lon: 11.7861 },
  ZRH: { iata: "ZRH", icao: "LSZH", name: "Zurich Airport", municipality: "Zurich", countryCode: "CH", lat: 47.4647, lon: 8.5492 },
  FCO: { iata: "FCO", icao: "LIRF", name: "Rome Fiumicino", municipality: "Rome", countryCode: "IT", lat: 41.800278, lon: 12.238889 },
  ORD: { iata: "ORD", icao: "KORD", name: "Chicago O'Hare", municipality: "Chicago", countryCode: "US", lat: 41.9786, lon: -87.9048 },
  LAX: { iata: "LAX", icao: "KLAX", name: "Los Angeles Intl", municipality: "Los Angeles", countryCode: "US", lat: 33.9425, lon: -118.4081 },
  ATL: { iata: "ATL", icao: "KATL", name: "Hartsfield-Jackson Atlanta", municipality: "Atlanta", countryCode: "US", lat: 33.6367, lon: -84.4281 },
  SAW: { iata: "SAW", icao: "LTFJ", name: "Istanbul Sabiha Gokcen", municipality: "Istanbul", countryCode: "TR", lat: 40.8986, lon: 29.3092 },
  LGW: { iata: "LGW", icao: "EGKK", name: "London Gatwick", municipality: "London", countryCode: "GB", lat: 51.1481, lon: -0.1903 },
  DUB: { iata: "DUB", icao: "EIDW", name: "Dublin Airport", municipality: "Dublin", countryCode: "IE", lat: 53.4213, lon: -6.2701 },
  LIS: { iata: "LIS", icao: "LPPT", name: "Lisbon Portela", municipality: "Lisbon", countryCode: "PT", lat: 38.7813, lon: -9.1359 },
};

function normalizeAeroUtc(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

interface AeroFlightMovement {
  airport?: {
    icao?: string;
    iata?: string;
    name?: string;
    shortName?: string;
    municipalityName?: string;
    countryCode?: string;
    location?: { lat?: number; lon?: number };
  };
  scheduledTime?: { utc?: string; local?: string };
  revisedTime?: { utc?: string; local?: string };
  runwayTime?: { utc?: string; local?: string };
  terminal?: string;
  gate?: string;
}

interface AeroFlightItem {
  number?: string;
  callSign?: string | null;
  status?: string;
  aircraft?: { reg?: string; model?: string };
  airline?: { name?: string; iata?: string; icao?: string };
  departure?: AeroFlightMovement;
  arrival?: AeroFlightMovement;
}

function extractAirportInfo(mov?: AeroFlightMovement): AirportInfo {
  const iata = (mov?.airport?.iata || "UNK").toUpperCase();
  const fallback = AIRPORT_FALLBACK_COORDS[iata];
  return {
    iata,
    icao: mov?.airport?.icao || fallback?.icao || iata,
    name: mov?.airport?.name || mov?.airport?.shortName || fallback?.name || iata,
    municipality:
      mov?.airport?.municipalityName || fallback?.municipality || iata,
    countryCode: (
      mov?.airport?.countryCode ||
      fallback?.countryCode ||
      "EU"
    ).toUpperCase(),
    lat: mov?.airport?.location?.lat ?? fallback?.lat ?? 50.0,
    lon: mov?.airport?.location?.lon ?? fallback?.lon ?? 8.5,
    terminal: mov?.terminal ?? null,
    gate: mov?.gate ?? null,
  };
}

interface OpenMeteoHourlyResponse {
  latitude: number;
  longitude: number;
  hourly?: {
    time: string[];
    temperature_2m?: Array<number | null>;
    precipitation?: Array<number | null>;
    weather_code?: Array<number | null>;
    visibility?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    wind_gusts_10m?: Array<number | null>;
  };
}

function parseOpenMeteoWindow(
  payload: OpenMeteoHourlyResponse,
  airport: AirportInfo,
  targetUtcIso: string
): AirportWeatherSnapshot {
  const targetMs = Date.parse(targetUtcIso);
  const times = payload.hourly?.time ?? [];
  const matchingIndices: number[] = [];

  for (let i = 0; i < times.length; i++) {
    const tStr = times[i].endsWith("Z") ? times[i] : `${times[i]}Z`;
    const tMs = Date.parse(tStr);
    if (!Number.isNaN(tMs) && Math.abs(tMs - targetMs) <= 65 * 60 * 1000) {
      matchingIndices.push(i);
    }
  }

  const indices =
    matchingIndices.length > 0
      ? matchingIndices
      : times.length > 0
        ? [Math.min(12, times.length - 1)]
        : [];

  let maxWindKt = 0;
  let maxGustKt = 0;
  let minVisKm = 16;
  let maxPrecipMm = 0;
  let tempC = 14;
  let worstCode = 0;
  let hasVis = false;

  for (const idx of indices) {
    const w = payload.hourly?.wind_speed_10m?.[idx];
    const g = payload.hourly?.wind_gusts_10m?.[idx];
    const vMeters = payload.hourly?.visibility?.[idx];
    const p = payload.hourly?.precipitation?.[idx];
    const t = payload.hourly?.temperature_2m?.[idx];
    const code = payload.hourly?.weather_code?.[idx];

    if (typeof w === "number" && w > maxWindKt) maxWindKt = w;
    if (typeof g === "number" && g > maxGustKt) maxGustKt = g;
    if (typeof vMeters === "number") {
      hasVis = true;
      const vKm = vMeters / 1000;
      if (vKm < minVisKm) minVisKm = vKm;
    }
    if (typeof p === "number" && p > maxPrecipMm) maxPrecipMm = p;
    if (typeof t === "number") tempC = t;
    if (typeof code === "number" && code > worstCode) worstCode = code;
  }

  const wmo = describeWmoCode(worstCode);
  const windowStart = new Date(targetMs - 3600000).toISOString().slice(11, 16);
  const windowEnd = new Date(targetMs + 3600000).toISOString().slice(11, 16);

  return {
    airportIata: airport.iata,
    airportName: airport.name,
    observedWindowUtc: `${targetUtcIso.slice(0, 10)} ${windowStart} to ${windowEnd} UTC`,
    windKt: Math.round(maxWindKt),
    gustKt: Math.round(maxGustKt || maxWindKt + 3),
    visibilityKm: Number((hasVis ? minVisKm : 10.0).toFixed(1)),
    precipitationMm: Number(maxPrecipMm.toFixed(1)),
    temperatureC: Math.round(tempC),
    weatherCode: worstCode,
    conditionLabel: wmo.label,
    isSevereCode: wmo.isSevere,
    provider: "Open-Meteo",
  };
}

interface VisualCrossingResponse {
  days?: Array<{
    datetime: string;
    hours?: Array<{
      datetime: string;
      temp?: number;
      precip?: number;
      windspeed?: number; // km/h when unitGroup=metric
      windgust?: number | null;
      visibility?: number; // km when unitGroup=metric
      conditions?: string;
    }>;
  }>;
}

function parseVisualCrossingWindow(
  payload: VisualCrossingResponse,
  airport: AirportInfo,
  targetUtcIso: string
): AirportWeatherSnapshot {
  const targetMs = Date.parse(targetUtcIso);
  const hours = payload.days?.flatMap((d) =>
    (d.hours ?? []).map((h) => ({
      ...h,
      iso: `${d.datetime}T${h.datetime}Z`,
    }))
  ) ?? [];

  const matched = hours.filter((h) => {
    const ms = Date.parse(h.iso);
    return !Number.isNaN(ms) && Math.abs(ms - targetMs) <= 65 * 60 * 1000;
  });

  const sample = matched.length > 0 ? matched : hours.slice(0, 3);
  let maxWindKt = 0;
  let maxGustKt = 0;
  let minVisKm = 16;
  let maxPrecipMm = 0;
  let tempC = 14;
  let conditionLabel = "Clear";
  let severe = false;

  for (const h of sample) {
    const wKt = (h.windspeed ?? 0) * 0.539957;
    const gKt = (h.windgust ?? h.windspeed ?? 0) * 0.539957;
    if (wKt > maxWindKt) maxWindKt = wKt;
    if (gKt > maxGustKt) maxGustKt = gKt;
    if (typeof h.visibility === "number" && h.visibility < minVisKm) {
      minVisKm = h.visibility;
    }
    if (typeof h.precip === "number" && h.precip > maxPrecipMm) {
      maxPrecipMm = h.precip;
    }
    if (typeof h.temp === "number") tempC = h.temp;
    if (h.conditions) {
      conditionLabel = h.conditions;
      if (isSevereConditionText(h.conditions)) severe = true;
    }
  }

  const windowStart = new Date(targetMs - 3600000).toISOString().slice(11, 16);
  const windowEnd = new Date(targetMs + 3600000).toISOString().slice(11, 16);

  return {
    airportIata: airport.iata,
    airportName: airport.name,
    observedWindowUtc: `${targetUtcIso.slice(0, 10)} ${windowStart} to ${windowEnd} UTC`,
    windKt: Math.round(maxWindKt),
    gustKt: Math.round(maxGustKt),
    visibilityKm: Number(minVisKm.toFixed(1)),
    precipitationMm: Number(maxPrecipMm.toFixed(1)),
    temperatureC: Math.round(tempC),
    weatherCode: severe ? 95 : 0,
    conditionLabel,
    isSevereCode: severe,
    provider: "Visual Crossing",
  };
}

/** Signs a realistic DEMO_MODE payload using the exact AirnodeHub EIP-191 attestation algorithm */
async function signDemoAttestation(params: {
  role: AirnodeAttestationRecord["role"];
  providerSlug: string;
  providerName: string;
  listingUrl: string;
  operation: string;
  parameters: Record<string, unknown>;
  payloadObject: unknown;
  timestampSec: number;
  priceUsd: number;
}): Promise<AirnodeAttestationRecord> {
  const account = privateKeyToAccount(DEMO_SIGNER_KEY);
  const data = JSON.stringify(params.payloadObject);
  const requestHash = computeAirnodeRequestHash(
    params.operation,
    params.parameters
  );
  const timestamp = String(params.timestampSec);
  const digest = computeAirnodeDigest({
    requestHash,
    timestamp,
    data,
  });
  const signature = await account.signMessage({
    message: { raw: digest },
  });

  return {
    id: `${params.role}-${params.providerSlug}`,
    role: params.role,
    providerSlug: params.providerSlug,
    providerName: params.providerName,
    listingUrl: params.listingUrl,
    operation: params.operation,
    parameters: params.parameters,
    airnode: account.address,
    requestHash,
    timestamp,
    data,
    signature,
    priceUsd: params.priceUsd,
    settlementTx: null,
    isDemoSigner: true,
  };
}

interface DemoFlightScenario {
  id: string;
  flightNumber: string;
  flightDate: string;
  flightStatus?: string;
  aircraftModel: string;
  aircraftReg: string;
  callSign: string;
  departureIata: string;
  arrivalIata: string;
  depTerminal: string;
  depGate: string;
  arrTerminal: string;
  arrGate: string;
  scheduledDepUtc: string;
  actualDepUtc: string | null;
  scheduledArrUtc: string;
  actualArrUtc: string | null;
  depWeather: {
    windKt: number;
    gustKt: number;
    visKm: number;
    precipMm: number;
    tempC: number;
    wmoCode: number;
  };
  arrWeather: {
    windKt: number;
    gustKt: number;
    visKm: number;
    precipMm: number;
    tempC: number;
    wmoCode: number;
  };
  featuredOnShameWall: boolean;
}

export const DEMO_SCENARIOS: DemoFlightScenario[] = [
  {
    id: "lh400-20261122",
    flightNumber: "LH400",
    flightDate: "2026-11-22",
    aircraftModel: "Boeing 747-8",
    aircraftReg: "D-ABYT",
    callSign: "DLH400",
    departureIata: "FRA",
    arrivalIata: "JFK",
    depTerminal: "1",
    depGate: "Z50",
    arrTerminal: "1",
    arrGate: "4",
    scheduledDepUtc: "2026-11-22T10:00:00.000Z",
    actualDepUtc: "2026-11-22T13:38:00.000Z",
    scheduledArrUtc: "2026-11-22T18:55:00.000Z",
    actualArrUtc: "2026-11-22T22:37:00.000Z", // +3h 42m (222m)
    depWeather: { windKt: 7, gustKt: 11, visKm: 10.0, precipMm: 0.0, tempC: 9, wmoCode: 0 },
    arrWeather: { windKt: 9, gustKt: 14, visKm: 16.0, precipMm: 0.0, tempC: 11, wmoCode: 1 },
    featuredOnShameWall: true,
  },
  {
    id: "fr1234-20261122",
    flightNumber: "FR1234",
    flightDate: "2026-11-22",
    aircraftModel: "Boeing 737 MAX 8-200",
    aircraftReg: "EI-HGS",
    callSign: "RYR1234",
    departureIata: "STN",
    arrivalIata: "BCN",
    depTerminal: "MAIN",
    depGate: "44",
    arrTerminal: "2",
    arrGate: "R18",
    scheduledDepUtc: "2026-11-22T07:20:00.000Z",
    actualDepUtc: "2026-11-22T10:42:00.000Z",
    scheduledArrUtc: "2026-11-22T09:35:00.000Z",
    actualArrUtc: "2026-11-22T12:53:00.000Z", // +3h 18m (198m)
    depWeather: { windKt: 6, gustKt: 9, visKm: 10.0, precipMm: 0.0, tempC: 8, wmoCode: 1 },
    arrWeather: { windKt: 8, gustKt: 12, visKm: 10.0, precipMm: 0.0, tempC: 16, wmoCode: 0 },
    featuredOnShameWall: true,
  },
  {
    id: "tk1952-20261122",
    flightNumber: "TK1952",
    flightDate: "2026-11-22",
    aircraftModel: "Airbus A321neo",
    aircraftReg: "TC-LTF",
    callSign: "THY1952",
    departureIata: "AMS",
    arrivalIata: "IST",
    depTerminal: "3",
    depGate: "G05",
    arrTerminal: "INTL",
    arrGate: "B14",
    scheduledDepUtc: "2026-11-22T11:25:00.000Z",
    actualDepUtc: "2026-11-22T15:35:00.000Z",
    scheduledArrUtc: "2026-11-22T15:10:00.000Z",
    actualArrUtc: "2026-11-22T19:15:00.000Z", // +4h 05m (245m), departs EU -> 400 EUR EU261
    depWeather: { windKt: 12, gustKt: 17, visKm: 10.0, precipMm: 0.0, tempC: 9, wmoCode: 2 },
    arrWeather: { windKt: 11, gustKt: 15, visKm: 10.0, precipMm: 0.0, tempC: 14, wmoCode: 1 },
    featuredOnShameWall: true,
  },
  {
    id: "ba456-20261122",
    flightNumber: "BA456",
    flightDate: "2026-11-22",
    aircraftModel: "Airbus A320neo",
    aircraftReg: "G-TTNG",
    callSign: "BAW456",
    departureIata: "LHR",
    arrivalIata: "MAD",
    depTerminal: "5",
    depGate: "A19",
    arrTerminal: "4S",
    arrGate: "S22",
    scheduledDepUtc: "2026-11-22T09:15:00.000Z",
    actualDepUtc: "2026-11-22T12:48:00.000Z",
    scheduledArrUtc: "2026-11-22T11:45:00.000Z",
    actualArrUtc: "2026-11-22T15:12:00.000Z", // +3h 27m (207m)
    depWeather: { windKt: 8, gustKt: 13, visKm: 10.0, precipMm: 0.0, tempC: 10, wmoCode: 0 },
    arrWeather: { windKt: 5, gustKt: 8, visKm: 10.0, precipMm: 0.0, tempC: 15, wmoCode: 0 },
    featuredOnShameWall: true,
  },
  {
    id: "ua901-20261122",
    flightNumber: "UA901",
    flightDate: "2026-11-22",
    aircraftModel: "Boeing 777-200ER",
    aircraftReg: "N78004",
    callSign: "UAL901",
    departureIata: "SFO",
    arrivalIata: "LHR",
    depTerminal: "I",
    depGate: "G6",
    arrTerminal: "2",
    arrGate: "B38",
    scheduledDepUtc: "2026-11-22T20:45:00.000Z",
    actualDepUtc: "2026-11-23T01:12:00.000Z",
    scheduledArrUtc: "2026-11-23T07:10:00.000Z",
    actualArrUtc: "2026-11-23T11:29:00.000Z", // +4h 19m (259m)
    depWeather: { windKt: 10, gustKt: 14, visKm: 16.0, precipMm: 0.0, tempC: 15, wmoCode: 1 },
    arrWeather: { windKt: 9, gustKt: 13, visKm: 10.0, precipMm: 0.0, tempC: 8, wmoCode: 2 },
    featuredOnShameWall: false,
  },
];

function buildHourlyOpenMeteoDemo(
  airport: AirportInfo,
  targetUtcIso: string,
  w: DemoFlightScenario["depWeather"]
): OpenMeteoHourlyResponse {
  const targetDate = targetUtcIso.slice(0, 10);
  const times: string[] = [];
  const temp: number[] = [];
  const precip: number[] = [];
  const code: number[] = [];
  const vis: number[] = [];
  const wind: number[] = [];
  const gust: number[] = [];

  for (let h = 0; h < 24; h++) {
    times.push(`${targetDate}T${String(h).padStart(2, "0")}:00`);
    temp.push(w.tempC);
    precip.push(w.precipMm);
    code.push(w.wmoCode);
    vis.push(Math.round(w.visKm * 1000));
    wind.push(w.windKt);
    gust.push(w.gustKt);
  }

  return {
    latitude: airport.lat,
    longitude: airport.lon,
    hourly: {
      time: times,
      temperature_2m: temp,
      precipitation: precip,
      weather_code: code,
      visibility: vis,
      wind_speed_10m: wind,
      wind_gusts_10m: gust,
    },
  };
}

function buildAeroDemoPayload(
  scenario: DemoFlightScenario,
  dep: AirportInfo,
  arr: AirportInfo
): AeroFlightItem[] {
  const profile = getAirlineProfile(scenario.flightNumber);
  return [
    {
      number: scenario.flightNumber.replace(/([A-Z0-9]{2})(\d+)/, "$1 $2"),
      callSign: scenario.callSign,
      status: scenario.flightStatus || "Arrived",
      aircraft: {
        reg: scenario.aircraftReg,
        model: scenario.aircraftModel,
      },
      airline: {
        name: profile.name,
        iata: profile.iata,
        icao: scenario.callSign.slice(0, 3),
      },
      departure: {
        airport: {
          icao: dep.icao,
          iata: dep.iata,
          name: dep.name,
          municipalityName: dep.municipality,
          countryCode: dep.countryCode,
          location: { lat: dep.lat, lon: dep.lon },
        },
        scheduledTime: {
          utc: scenario.scheduledDepUtc.replace("T", " ").replace(".000Z", "Z"),
        },
        revisedTime: scenario.actualDepUtc
          ? {
              utc: scenario.actualDepUtc.replace("T", " ").replace(".000Z", "Z"),
            }
          : undefined,
        terminal: scenario.depTerminal,
        gate: scenario.depGate,
      },
      arrival: {
        airport: {
          icao: arr.icao,
          iata: arr.iata,
          name: arr.name,
          municipalityName: arr.municipality,
          countryCode: arr.countryCode,
          location: { lat: arr.lat, lon: arr.lon },
        },
        scheduledTime: {
          utc: scenario.scheduledArrUtc.replace("T", " ").replace(".000Z", "Z"),
        },
        revisedTime: scenario.actualArrUtc
          ? {
              utc: scenario.actualArrUtc.replace("T", " ").replace(".000Z", "Z"),
            }
          : undefined,
        terminal: scenario.arrTerminal,
        gate: scenario.arrGate,
      },
    },
  ];
}

function synthesizeDemoScenario(
  flightNumber: string,
  flightDate: string
): DemoFlightScenario {
  const norm = normalizeFlightNumber(flightNumber);
  const existing = DEMO_SCENARIOS.find((s) => s.flightNumber === norm);
  if (existing) {
    // Adjust dates to match the requested date while preserving exact delay delta
    const depDeltaMs = existing.actualDepUtc
      ? Date.parse(existing.actualDepUtc) - Date.parse(existing.scheduledDepUtc)
      : 0;
    const arrDeltaMs = existing.actualArrUtc
      ? Date.parse(existing.actualArrUtc) - Date.parse(existing.scheduledArrUtc)
      : 0;
    const durationMs =
      Date.parse(existing.scheduledArrUtc) - Date.parse(existing.scheduledDepUtc);

    const depTimePart = existing.scheduledDepUtc.slice(11);
    const newSchedDepMs = Date.parse(`${flightDate}T${depTimePart}`);
    const newActualDepMs = newSchedDepMs + depDeltaMs;
    const newSchedArrMs = newSchedDepMs + durationMs;
    const newActualArrMs = newSchedArrMs + arrDeltaMs;

    return {
      ...existing,
      id: `${norm.toLowerCase()}-${flightDate.replace(/-/g, "")}`,
      flightDate,
      scheduledDepUtc: new Date(newSchedDepMs).toISOString(),
      actualDepUtc: existing.actualDepUtc ? new Date(newActualDepMs).toISOString() : null,
      scheduledArrUtc: new Date(newSchedArrMs).toISOString(),
      actualArrUtc: existing.actualArrUtc ? new Date(newActualArrMs).toISOString() : null,
      featuredOnShameWall: existing.flightDate === flightDate && existing.featuredOnShameWall,
    };
  }

  // Deterministic hash from flightNumber + date so any custom flight queried in DEMO_MODE works smoothly
  let hash = 0;
  const seed = `${norm}:${flightDate}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const routePairs: Array<[string, string, number]> = [
    ["CDG", "JFK", 495],
    ["AMS", "BCN", 135],
    ["LHR", "FCO", 155],
    ["FRA", "MAD", 160],
    ["IST", "LHR", 245],
    ["MUC", "ORD", 560],
    ["DUB", "BCN", 150],
    ["ZRH", "LIS", 170],
  ];

  const prefix = norm.slice(0, 2);
  let pair = routePairs[hash % routePairs.length];
  if (prefix === "AF") pair = ["CDG", "JFK", 495];
  else if (prefix === "KL") pair = ["AMS", "BCN", 135];
  else if (prefix === "TK" || prefix === "PC") pair = ["IST", "LHR", 245];
  else if (prefix === "BA" || prefix === "U2") pair = ["LHR", "FCO", 155];
  else if (prefix === "DL" || prefix === "AA" || prefix === "UA") pair = ["JFK", "LHR", 420];
  else if (prefix === "EK") pair = ["DXB", "LHR", 445];
  else if (prefix === "QR") pair = ["DOH", "FRA", 390];

  // Special suffix hints for testing different verdicts in demo mode:
  // "999" -> severe storm; "000" -> on-time; "888" -> cancelled under clear skies
  const isStormTest = norm.endsWith("999");
  const isOnTimeTest = norm.endsWith("000");
  const isCancelTest = norm.endsWith("888");

  const delayMins = isOnTimeTest ? 6 : 185 + (hash % 95);
  const depHour = 7 + (hash % 11);
  const schedDepMs = Date.parse(
    `${flightDate}T${String(depHour).padStart(2, "0")}:15:00.000Z`
  );
  const schedArrMs = schedDepMs + pair[2] * 60000;

  return {
    id: `${norm.toLowerCase()}-${flightDate.replace(/-/g, "")}`,
    flightNumber: norm,
    flightDate,
    flightStatus: isCancelTest ? "Canceled" : "Arrived",
    aircraftModel: pair[2] > 300 ? "Airbus A350-900" : "Airbus A320neo",
    aircraftReg: `${prefix}-${String(100 + (hash % 899))}`,
    callSign: `${prefix}${norm.slice(2)}`,
    departureIata: pair[0],
    arrivalIata: pair[1],
    depTerminal: String(1 + (hash % 4)),
    depGate: `B${10 + (hash % 35)}`,
    arrTerminal: String(1 + ((hash >> 2) % 3)),
    arrGate: `A${5 + (hash % 25)}`,
    scheduledDepUtc: new Date(schedDepMs).toISOString(),
    actualDepUtc: isCancelTest
      ? null
      : new Date(schedDepMs + delayMins * 60000).toISOString(),
    scheduledArrUtc: new Date(schedArrMs).toISOString(),
    actualArrUtc: isCancelTest
      ? null
      : new Date(schedArrMs + delayMins * 60000).toISOString(),
    depWeather: isStormTest
      ? { windKt: 42, gustKt: 54, visKm: 1.1, precipMm: 14.2, tempC: 3, wmoCode: 95 }
      : { windKt: 6 + (hash % 9), gustKt: 10 + (hash % 8), visKm: 10.0, precipMm: 0.0, tempC: 12, wmoCode: hash % 3 },
    arrWeather: {
      windKt: 5 + ((hash >> 3) % 10),
      gustKt: 9 + ((hash >> 3) % 8),
      visKm: 10.0,
      precipMm: 0.0,
      tempC: 14,
      wmoCode: (hash >> 1) % 3,
    },
    featuredOnShameWall: false,
  };
}

export async function buildProofFromDemoScenario(
  scenario: DemoFlightScenario
): Promise<FlightProofRecord> {
  const dep = {
    ...(AIRPORT_FALLBACK_COORDS[scenario.departureIata] ||
      AIRPORT_FALLBACK_COORDS.FRA),
    terminal: scenario.depTerminal,
    gate: scenario.depGate,
  };
  const arr = {
    ...(AIRPORT_FALLBACK_COORDS[scenario.arrivalIata] ||
      AIRPORT_FALLBACK_COORDS.JFK),
    terminal: scenario.arrTerminal,
    gate: scenario.arrGate,
  };

  const aeroPayload = buildAeroDemoPayload(scenario, dep, arr);
  const depWeatherPayload = buildHourlyOpenMeteoDemo(
    dep,
    scenario.scheduledDepUtc,
    scenario.depWeather
  );
  const arrWeatherPayload = buildHourlyOpenMeteoDemo(
    arr,
    scenario.scheduledArrUtc,
    scenario.arrWeather
  );

  const baseTs =
    Math.floor(
      Date.parse(scenario.actualArrUtc || scenario.scheduledArrUtc) / 1000
    ) + 180;

  const [aeroAttest, depWeatherAttest, arrWeatherAttest] = await Promise.all([
    signDemoAttestation({
      role: "flight_status",
      providerSlug: AIRNODE_LISTINGS.aerodatabox.slug,
      providerName: AIRNODE_LISTINGS.aerodatabox.name,
      listingUrl: AIRNODE_LISTINGS.aerodatabox.url,
      operation: "flightStatusOnDate",
      parameters: {
        searchBy: "number",
        searchParam: scenario.flightNumber,
        dateLocal: scenario.flightDate,
        dateLocalRole: "Both",
      },
      payloadObject: aeroPayload,
      timestampSec: baseTs,
      priceUsd: AIRNODE_LISTINGS.aerodatabox.prices.flightStatusOnDate,
    }),
    signDemoAttestation({
      role: "departure_weather",
      providerSlug: AIRNODE_LISTINGS.openMeteo.slug,
      providerName: AIRNODE_LISTINGS.openMeteo.name,
      listingUrl: AIRNODE_LISTINGS.openMeteo.url,
      operation: "forecast",
      parameters: {
        latitude: String(dep.lat),
        longitude: String(dep.lon),
        start_date: scenario.scheduledDepUtc.slice(0, 10),
        end_date: scenario.scheduledDepUtc.slice(0, 10),
        wind_speed_unit: "kn",
        timezone: "UTC",
        hourly:
          "temperature_2m,precipitation,weather_code,visibility,wind_speed_10m,wind_gusts_10m",
      },
      payloadObject: depWeatherPayload,
      timestampSec: baseTs + 2,
      priceUsd: AIRNODE_LISTINGS.openMeteo.prices.forecast,
    }),
    signDemoAttestation({
      role: "arrival_weather",
      providerSlug: AIRNODE_LISTINGS.openMeteo.slug,
      providerName: AIRNODE_LISTINGS.openMeteo.name,
      listingUrl: AIRNODE_LISTINGS.openMeteo.url,
      operation: "forecast",
      parameters: {
        latitude: String(arr.lat),
        longitude: String(arr.lon),
        start_date: scenario.scheduledArrUtc.slice(0, 10),
        end_date: scenario.scheduledArrUtc.slice(0, 10),
        wind_speed_unit: "kn",
        timezone: "UTC",
        hourly:
          "temperature_2m,precipitation,weather_code,visibility,wind_speed_10m,wind_gusts_10m",
      },
      payloadObject: arrWeatherPayload,
      timestampSec: baseTs + 4,
      priceUsd: AIRNODE_LISTINGS.openMeteo.prices.forecast,
    }),
  ]);

  const depWeatherSnap = parseOpenMeteoWindow(
    depWeatherPayload,
    dep,
    scenario.scheduledDepUtc
  );
  const arrWeatherSnap = parseOpenMeteoWindow(
    arrWeatherPayload,
    arr,
    scenario.scheduledArrUtc
  );

  const airline = getAirlineProfile(scenario.flightNumber);
  const flightStatusRaw = scenario.flightStatus || "Arrived";
  const verdict = buildDelayVerdict({
    flightNumber: scenario.flightNumber,
    flightStatusRaw,
    departure: dep,
    arrival: arr,
    airlineRegion: airline.region,
    scheduledDepartureUtc: scenario.scheduledDepUtc,
    actualDepartureUtc: scenario.actualDepUtc,
    scheduledArrivalUtc: scenario.scheduledArrUtc,
    actualArrivalUtc: scenario.actualArrUtc,
    departureWeather: depWeatherSnap,
    arrivalWeather: arrWeatherSnap,
  });

  return {
    id: scenario.id,
    cacheKey: `${scenario.flightNumber}:${scenario.flightDate}`,
    createdAtUtc: new Date(baseTs * 1000).toISOString(),
    mode: "DEMO",
    flightNumber: scenario.flightNumber,
    flightDate: scenario.flightDate,
    airlineIata: airline.iata,
    airlineName: airline.name,
    airlineHandle: airline.handle,
    aircraftModel: scenario.aircraftModel,
    flightStatusRaw,
    departure: dep,
    arrival: arr,
    scheduledDepartureUtc: scenario.scheduledDepUtc,
    actualDepartureUtc: scenario.actualDepUtc,
    scheduledArrivalUtc: scenario.scheduledArrUtc,
    actualArrivalUtc: scenario.actualArrUtc,
    departureWeather: depWeatherSnap,
    arrivalWeather: arrWeatherSnap,
    verdict,
    attestations: [aeroAttest, depWeatherAttest, arrWeatherAttest],
    signatureDigestShort: `${aeroAttest.signature.slice(0, 10)}...${aeroAttest.signature.slice(-8)}`,
    totalApiCostUsd: Number(
      (
        aeroAttest.priceUsd +
        depWeatherAttest.priceUsd +
        arrWeatherAttest.priceUsd
      ).toFixed(4)
    ),
    featuredOnShameWall: scenario.featuredOnShameWall,
  };
}

/**
 * Fetches live flight status + departure/arrival weather via AirnodeHub x402
 * or serves cryptographically signed DEMO_MODE scenarios when DEMO_MODE=true.
 */
export async function fetchSignedFlightProof(params: {
  flightNumber: string;
  flightDate: string;
}): Promise<FlightProofRecord> {
  const flightNumber = normalizeFlightNumber(params.flightNumber);
  const flightDate = params.flightDate.trim();

  if (isDemoMode()) {
    const scenario = synthesizeDemoScenario(flightNumber, flightDate);
    return buildProofFromDemoScenario(scenario);
  }

  const maxLookupRaw =
    (await getServerSecret("AIRNODEHUB_MAX_USD_PER_LOOKUP")) || "1.20";
  const maxLookupUsd = Number(maxLookupRaw) || 1.2;
  let remainingBudget = maxLookupUsd;

  // Detect 3-letter ICAO ATC callsigns (e.g. TKJ94L, THY1952, DLH400) vs 2-char IATA flight numbers (e.g. LH400, FR1234, U28412)
  const isIcaoCallsign = /^[A-Z]{3}\d[A-Z0-9]*$/.test(flightNumber);
  const searchBy = isIcaoCallsign ? "callsign" : "number";

  // 1. Flight Status via AeroDataBox Airnode
  const aeroCall = await callLiveAirnodeOperation({
    listing: AIRNODE_LISTINGS.aerodatabox,
    role: "flight_status",
    operation: "flightStatusOnDate",
    parameters: {
      searchBy,
      searchParam: flightNumber,
      dateLocal: flightDate,
      dateLocalRole: "Both",
    },
    maxPriceUsd: remainingBudget,
  });
  remainingBudget -= aeroCall.record.priceUsd;

  const flightList = Array.isArray(aeroCall.parsedData)
    ? (aeroCall.parsedData as AeroFlightItem[])
    : aeroCall.parsedData
      ? [aeroCall.parsedData as AeroFlightItem]
      : [];

  const flight = flightList[0];
  if (!flight || !flight.departure || !flight.arrival) {
    const err = new Error(
      `No flight record found for ${flightNumber} on ${flightDate}. If this flight is in the air right now, switch date to TODAY; or enter the passenger IATA flight number (e.g. LH400, TK1952, VF3094) instead of an ATC callsign.`
    ) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  // Prefer official IATA flight number from AeroDataBox if user searched by ICAO callsign (e.g. TKJ94L -> VF3094)
  const resolvedFlightNumber = flight.number
    ? normalizeFlightNumber(flight.number)
    : flightNumber;

  const dep = extractAirportInfo(flight.departure);
  const arr = extractAirportInfo(flight.arrival);

  const scheduledDepartureUtc =
    normalizeAeroUtc(flight.departure.scheduledTime?.utc) ||
    `${flightDate}T12:00:00.000Z`;
  const actualDepartureUtc =
    normalizeAeroUtc(flight.departure.revisedTime?.utc) ||
    normalizeAeroUtc(flight.departure.runwayTime?.utc);
  const scheduledArrivalUtc =
    normalizeAeroUtc(flight.arrival.scheduledTime?.utc) ||
    scheduledDepartureUtc;
  const actualArrivalUtc =
    normalizeAeroUtc(flight.arrival.revisedTime?.utc) ||
    normalizeAeroUtc(flight.arrival.runwayTime?.utc);

  const weatherProvider = (
    (await getServerSecret("AIRNODEHUB_WEATHER_PROVIDER")) || "open-meteo"
  ).toLowerCase();

  const fetchAirportWeather = async (
    airport: AirportInfo,
    targetUtcIso: string,
    role: "departure_weather" | "arrival_weather"
  ): Promise<{
    snap: AirportWeatherSnapshot;
    record: AirnodeAttestationRecord;
  }> => {
    const dateStr = targetUtcIso.slice(0, 10);

    if (weatherProvider === "visualcrossing") {
      const vc = await callLiveAirnodeOperation({
        listing: AIRNODE_LISTINGS.visualCrossing,
        role,
        operation: "getTimelinePeriod",
        parameters: {
          location: `${airport.lat},${airport.lon}`,
          date1: dateStr,
          unitGroup: "metric",
          include: "hours",
          timezone: "Z",
          iconSet: "icons2",
        },
        maxPriceUsd: remainingBudget,
      });
      remainingBudget -= vc.record.priceUsd;
      return {
        snap: parseVisualCrossingWindow(
          vc.parsedData as VisualCrossingResponse,
          airport,
          targetUtcIso
        ),
        record: vc.record,
      };
    }

    // Default: Open-Meteo (uses forecast for recent <= 60 days @ $0.02, historicalForecast for older dates @ $0.10)
    const daysAgo = Math.floor(
      (Date.now() - Date.parse(targetUtcIso)) / 86_400_000
    );
    const opName = daysAgo > 60 ? "historicalForecast" : "forecast";

    const om = await callLiveAirnodeOperation({
      listing: AIRNODE_LISTINGS.openMeteo,
      role,
      operation: opName,
      parameters: {
        latitude: String(airport.lat),
        longitude: String(airport.lon),
        start_date: dateStr,
        end_date: dateStr,
        wind_speed_unit: "kn",
        timezone: "UTC",
        hourly:
          "temperature_2m,precipitation,weather_code,visibility,wind_speed_10m,wind_gusts_10m",
      },
      maxPriceUsd: remainingBudget,
    });
    remainingBudget -= om.record.priceUsd;
    return {
      snap: parseOpenMeteoWindow(
        om.parsedData as OpenMeteoHourlyResponse,
        airport,
        targetUtcIso
      ),
      record: om.record,
    };
  };

  const depWeatherRes = await fetchAirportWeather(
    dep,
    scheduledDepartureUtc,
    "departure_weather"
  );
  const arrWeatherRes = await fetchAirportWeather(
    arr,
    scheduledArrivalUtc,
    "arrival_weather"
  );

  const airline = getAirlineProfile(resolvedFlightNumber, flight.airline?.name);
  const verdict = buildDelayVerdict({
    flightNumber: resolvedFlightNumber,
    flightStatusRaw: flight.status || "Reported",
    departure: dep,
    arrival: arr,
    airlineRegion: airline.region,
    scheduledDepartureUtc,
    actualDepartureUtc,
    scheduledArrivalUtc,
    actualArrivalUtc,
    departureWeather: depWeatherRes.snap,
    arrivalWeather: arrWeatherRes.snap,
  });

  const attestations = [
    aeroCall.record,
    depWeatherRes.record,
    arrWeatherRes.record,
  ];
  const shortId = `${resolvedFlightNumber.toLowerCase()}-${flightDate.replace(/-/g, "")}`;
  const totalCost = attestations.reduce((sum, a) => sum + a.priceUsd, 0);

  return {
    id: shortId,
    cacheKey: `${flightNumber}:${flightDate}`,
    createdAtUtc: new Date().toISOString(),
    mode: "LIVE" as DataMode,
    flightNumber: resolvedFlightNumber,
    flightDate,
    airlineIata: airline.iata,
    airlineName: flight.airline?.name || airline.name,
    airlineHandle: airline.handle,
    aircraftModel: flight.aircraft?.model || "Commercial Jet",
    flightStatusRaw: flight.status || "Reported",
    departure: dep,
    arrival: arr,
    scheduledDepartureUtc,
    actualDepartureUtc,
    scheduledArrivalUtc,
    actualArrivalUtc,
    departureWeather: depWeatherRes.snap,
    arrivalWeather: arrWeatherRes.snap,
    verdict,
    attestations,
    signatureDigestShort: `${aeroCall.record.signature.slice(0, 10)}...${aeroCall.record.signature.slice(-8)}`,
    totalApiCostUsd: Number(totalCost.toFixed(4)),
    featuredOnShameWall: false,
  };
}

/**
 * Budget-capped live Shame Wall scanner using aerodatabox:airportSchedule ($0.05/hub).
 * Scans recent arrivals at major hubs, identifies 3h+ delays or cancellations,
 * verifies weather via AirnodeHub, and returns clear-sky featured proofs.
 */
export async function scanShameWallHubs(params?: {
  airports?: string[];
  maxResults?: number;
  maxBudgetUsd?: number;
}): Promise<{
  discovered: FlightProofRecord[];
  spentUsd: number;
  scannedHubs: string[];
}> {
  if (isDemoMode()) {
    const demoProofs = await Promise.all(
      DEMO_SCENARIOS.filter((s) => s.featuredOnShameWall).map((s) =>
        buildProofFromDemoScenario(s)
      )
    );
    return {
      discovered: demoProofs,
      spentUsd: 0,
      scannedHubs: ["DEMO"],
    };
  }

  const airports = (params?.airports || ["LHR", "FRA", "AMS"]).slice(0, 4);
  const maxResults = params?.maxResults ?? 4;
  let budgetLeft = params?.maxBudgetUsd ?? 0.45;
  let spentUsd = 0;
  const discovered: FlightProofRecord[] = [];
  const scannedHubs: string[] = [];

  for (const iata of airports) {
    if (discovered.length >= maxResults || budgetLeft < 0.05) break;

    try {
      const sched = await callLiveAirnodeOperation({
        listing: AIRNODE_LISTINGS.aerodatabox,
        role: "flight_status",
        operation: "airportSchedule",
        parameters: {
          codeType: "iata",
          code: iata,
          offsetMinutes: -360,
          durationMinutes: 360,
          direction: "Arrival",
          withLeg: true,
          withCancelled: true,
          withCodeshared: false,
          withCargo: false,
          withPrivate: false,
        },
        maxPriceUsd: budgetLeft,
      });

      spentUsd += sched.record.priceUsd;
      budgetLeft -= sched.record.priceUsd;
      scannedHubs.push(iata);

      const payload = sched.parsedData as { arrivals?: AeroFlightItem[] };
      const arrivals = Array.isArray(payload.arrivals) ? payload.arrivals : [];

      const candidates = arrivals
        .filter((f) => {
          if (!f.number) return false;
          const schedArr = normalizeAeroUtc(f.arrival?.scheduledTime?.utc);
          const actualArr =
            normalizeAeroUtc(f.arrival?.revisedTime?.utc) ||
            normalizeAeroUtc(f.arrival?.runwayTime?.utc);
          if (!schedArr) return false;
          const d = computeDelay({
            flightStatusRaw: f.status,
            scheduledArrivalUtc: schedArr,
            actualArrivalUtc: actualArr,
            scheduledDepartureUtc:
              normalizeAeroUtc(f.departure?.scheduledTime?.utc) || schedArr,
            actualDepartureUtc: normalizeAeroUtc(f.departure?.revisedTime?.utc),
          });
          return d.delayStatus === "CANCELLED" || d.delayMinutes >= 180;
        })
        .slice(0, 2);

      for (const cand of candidates) {
        if (discovered.length >= maxResults || budgetLeft < 0.09) break;
        const fn = normalizeFlightNumber(cand.number || "");
        const dateStr = (
          normalizeAeroUtc(cand.departure?.scheduledTime?.utc) ||
          normalizeAeroUtc(cand.arrival?.scheduledTime?.utc) ||
          new Date().toISOString()
        ).slice(0, 10);
        if (!fn) continue;

        try {
          const proof = await fetchSignedFlightProof({
            flightNumber: fn,
            flightDate: dateStr,
          });
          spentUsd += proof.totalApiCostUsd;
          budgetLeft -= proof.totalApiCostUsd;

          if (proof.verdict.weatherVerdict === "NOT_WEATHER") {
            proof.featuredOnShameWall = true;
            discovered.push(proof);
          }
        } catch {
          // Skip individual flight fetch failures gracefully
        }
      }
    } catch {
      // Skip hub failure and continue within budget
    }
  }

  return {
    discovered,
    spentUsd: Number(spentUsd.toFixed(4)),
    scannedHubs,
  };
}
