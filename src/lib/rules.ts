import {
  AirportInfo,
  AirportWeatherSnapshot,
  CompensationEstimate,
  DelayBasis,
  DelayStatus,
  DelayVerdict,
  WeatherVerdictCode,
} from "./types";

const EU_EEA_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU",
  "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
]);

/** Severe WMO weather interpretation codes: thunderstorms, hail, freezing rain/drizzle, heavy snow */
export const SEVERE_WMO_CODES = new Set([56, 57, 66, 67, 75, 86, 95, 96, 99]);

export function describeWmoCode(code: number): { label: string; isSevere: boolean } {
  const table: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow / blizzard",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm with heavy hail",
  };
  return {
    label: table[code] ?? "Fair conditions",
    isSevere: SEVERE_WMO_CODES.has(code),
  };
}

export function isSevereConditionText(text: string): boolean {
  return /(thunderstorm|blizzard|freezing rain|ice pellets|tornado|hurricane|squall|hail|volcanic)/i.test(
    text
  );
}

/** Great-circle distance in kilometers via Haversine formula */
export function computeHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0088;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function isCancelledFlightStatus(rawStatus?: string | null): boolean {
  if (!rawStatus) return false;
  return /(cancel|cncl)/i.test(rawStatus);
}

export function computeDelay(params: {
  flightStatusRaw?: string | null;
  scheduledArrivalUtc: string;
  actualArrivalUtc: string | null;
  scheduledDepartureUtc: string;
  actualDepartureUtc: string | null;
}): {
  delayMinutes: number;
  delayBasis: DelayBasis;
  delayStatus: DelayStatus;
  delayFormatted: string;
} {
  if (isCancelledFlightStatus(params.flightStatusRaw)) {
    return {
      delayMinutes: 0,
      delayBasis: "CANCELLED",
      delayStatus: "CANCELLED",
      delayFormatted: "FLIGHT CANCELLED",
    };
  }

  let delayMinutes = 0;
  let delayBasis: DelayBasis = "ARRIVAL_DELAY";

  if (params.actualArrivalUtc && params.scheduledArrivalUtc) {
    const diffMs =
      Date.parse(params.actualArrivalUtc) - Date.parse(params.scheduledArrivalUtc);
    delayMinutes = Math.round(diffMs / 60000);
    delayBasis = "ARRIVAL_DELAY";
  } else if (params.actualDepartureUtc && params.scheduledDepartureUtc) {
    const diffMs =
      Date.parse(params.actualDepartureUtc) -
      Date.parse(params.scheduledDepartureUtc);
    delayMinutes = Math.round(diffMs / 60000);
    delayBasis = "DEPARTURE_DELAY";
  }

  const clamped = Math.max(0, delayMinutes);
  const delayStatus: DelayStatus = clamped < 15 ? "ON_TIME" : "DELAYED";

  return {
    delayMinutes: clamped,
    delayBasis,
    delayStatus,
    delayFormatted: formatDelayDuration(clamped, delayStatus),
  };
}

export function formatDelayDuration(
  delayMinutes: number,
  status: DelayStatus = delayMinutes < 15 ? "ON_TIME" : "DELAYED"
): string {
  if (status === "CANCELLED") return "FLIGHT CANCELLED";
  if (status === "ON_TIME") {
    return delayMinutes === 0 ? "ON TIME" : `+${delayMinutes}M ON TIME`;
  }
  const h = Math.floor(delayMinutes / 60);
  const m = delayMinutes % 60;
  if (h === 0) return `+${m}M DELAYED`;
  if (m === 0) return `+${h}H 00M DELAYED`;
  return `+${h}H ${String(m).padStart(2, "0")}M DELAYED`;
}

export function formatDelaySpeech(delayMinutes: number): string {
  if (delayMinutes < 15) return "on time";
  const h = Math.floor(delayMinutes / 60);
  const m = delayMinutes % 60;
  if (h === 0) return `${m} ${m === 1 ? "minute" : "minutes"} late`;
  if (m === 0) return `${h} ${h === 1 ? "hour" : "hours"} late`;
  return `${h} ${h === 1 ? "hour" : "hours"} and ${m} ${m === 1 ? "minute" : "minutes"} late`;
}

function inspectAirportWeather(snap: AirportWeatherSnapshot): {
  verdict: WeatherVerdictCode;
  triggers: string[];
} {
  const severeTriggers: string[] = [];
  if (snap.windKt > 35) {
    severeTriggers.push(`${snap.airportIata} WIND ${snap.windKt} KT (> 35 KT LIMIT)`);
  }
  if (snap.gustKt > 45) {
    severeTriggers.push(`${snap.airportIata} GUST ${snap.gustKt} KT (> 45 KT LIMIT)`);
  }
  if (snap.visibilityKm < 1.5) {
    severeTriggers.push(
      `${snap.airportIata} VISIBILITY ${snap.visibilityKm.toFixed(1)} KM (< 1.5 KM LIMIT)`
    );
  }
  if (snap.isSevereCode || isSevereConditionText(snap.conditionLabel)) {
    severeTriggers.push(
      `${snap.airportIata} SEVERE CODE (${snap.conditionLabel.toUpperCase()})`
    );
  }
  if (severeTriggers.length > 0) {
    return { verdict: "SEVERE_WEATHER", triggers: severeTriggers };
  }

  const borderlineTriggers: string[] = [];
  if (snap.windKt >= 25 && snap.windKt <= 35) {
    borderlineTriggers.push(
      `${snap.airportIata} WIND ${snap.windKt} KT (25 TO 35 KT BAND)`
    );
  }
  if (snap.visibilityKm >= 1.5 && snap.visibilityKm <= 3.0) {
    borderlineTriggers.push(
      `${snap.airportIata} VISIBILITY ${snap.visibilityKm.toFixed(1)} KM (1.5 TO 3.0 KM BAND)`
    );
  }
  if (borderlineTriggers.length > 0) {
    return { verdict: "BORDERLINE_WEATHER", triggers: borderlineTriggers };
  }

  return { verdict: "NOT_WEATHER", triggers: [] };
}

export function evaluateWeatherExcuse(
  departureWeather: AirportWeatherSnapshot,
  arrivalWeather: AirportWeatherSnapshot
): {
  verdict: WeatherVerdictCode;
  triggerReason: string;
  summary: string;
} {
  const dep = inspectAirportWeather(departureWeather);
  const arr = inspectAirportWeather(arrivalWeather);

  let verdict: WeatherVerdictCode = "NOT_WEATHER";
  let triggerReason = "";

  if (dep.verdict === "SEVERE_WEATHER" || arr.verdict === "SEVERE_WEATHER") {
    verdict = "SEVERE_WEATHER";
    const severeReasons = [
      ...(dep.verdict === "SEVERE_WEATHER" ? dep.triggers : []),
      ...(arr.verdict === "SEVERE_WEATHER" ? arr.triggers : []),
    ];
    triggerReason = `TRIGGER: ${severeReasons.join(" · ")}`;
  } else if (
    dep.verdict === "BORDERLINE_WEATHER" ||
    arr.verdict === "BORDERLINE_WEATHER"
  ) {
    verdict = "BORDERLINE_WEATHER";
    const borderlineReasons = [...dep.triggers, ...arr.triggers];
    triggerReason = `TRIGGER: ${borderlineReasons.join(" · ")}`;
  } else {
    const maxWind = Math.max(departureWeather.windKt, arrivalWeather.windKt);
    const minVis = Math.min(
      departureWeather.visibilityKm,
      arrivalWeather.visibilityKm
    );
    triggerReason = `ALL CHECKS CLEAR: MAX WIND ${maxWind} KT · MIN VIS ${minVis.toFixed(1)} KM · NO SEVERE CODES`;
  }

  const depSummary = `${departureWeather.airportIata}: ${departureWeather.conditionLabel}, ${departureWeather.windKt} kt wind, ${departureWeather.visibilityKm.toFixed(1)} km vis`;
  const arrSummary = `${arrivalWeather.airportIata}: ${arrivalWeather.conditionLabel}, ${arrivalWeather.windKt} kt wind, ${arrivalWeather.visibilityKm.toFixed(1)} km vis`;

  return {
    verdict,
    triggerReason,
    summary: `${depSummary} | ${arrSummary}`,
  };
}

type JurisdictionCode = "EU261" | "UK261" | "SHY_PASSENGER" | "US_DOT" | "INTL";

/**
 * Legally accurate statutory jurisdiction classifier:
 * - EU261: Departs EU/EEA (any airline) OR arrives EU/EEA on an EU/EEA airline
 * - UK261: Departs UK (any airline) OR arrives UK on a UK or EU airline
 * - SHY-Passenger: Departs Turkey (any airline) OR arrives Turkey on a Turkish airline (when not EU261/UK261)
 * - US DOT: US domestic or US-touching flight outside EU261/UK261/SHY
 */
function classifyJurisdiction(
  departure: AirportInfo,
  arrival: AirportInfo,
  airlineRegion: "EU" | "UK" | "TR" | "US" | "INTL"
): { code: JurisdictionCode; label: string; isDomesticTr: boolean } {
  const depEu = EU_EEA_COUNTRIES.has(departure.countryCode);
  const arrEu = EU_EEA_COUNTRIES.has(arrival.countryCode);
  const depUk = departure.countryCode === "GB";
  const arrUk = arrival.countryCode === "GB";
  const depTr = departure.countryCode === "TR";
  const arrTr = arrival.countryCode === "TR";
  const depUs = departure.countryCode === "US";
  const arrUs = arrival.countryCode === "US";

  const euEligible = depEu || (arrEu && airlineRegion === "EU");
  const ukEligible =
    depUk || (arrUk && (airlineRegion === "UK" || airlineRegion === "EU"));
  const trEligible = depTr || (arrTr && airlineRegion === "TR");

  if (euEligible && ukEligible) {
    return { code: "EU261", label: "EU261 / UK261", isDomesticTr: false };
  }
  if (euEligible) {
    return { code: "EU261", label: "EU261", isDomesticTr: false };
  }
  if (ukEligible) {
    return { code: "UK261", label: "UK261", isDomesticTr: false };
  }
  if (trEligible) {
    return {
      code: "SHY_PASSENGER",
      label: "SHY-PASSENGER",
      isDomesticTr: depTr && arrTr,
    };
  }
  if (depUs || arrUs) {
    return { code: "US_DOT", label: "US DOT", isDomesticTr: false };
  }
  return { code: "INTL", label: "PASSENGER RIGHTS", isDomesticTr: false };
}

export function estimateCompensation(params: {
  delayMinutes: number;
  delayStatus: DelayStatus;
  weatherVerdict: WeatherVerdictCode;
  departure: AirportInfo;
  arrival: AirportInfo;
  airlineRegion: "EU" | "UK" | "TR" | "US" | "INTL";
}): CompensationEstimate {
  const distanceKm = computeHaversineKm(
    params.departure.lat,
    params.departure.lon,
    params.arrival.lat,
    params.arrival.lon
  );
  const jurisdiction = classifyJurisdiction(
    params.departure,
    params.arrival,
    params.airlineRegion
  );

  if (params.delayStatus === "ON_TIME") {
    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: jurisdiction.label,
      badgeText: "NO CLAIM · FLIGHT ON TIME",
      reason: "Arrival delay was under 15 minutes.",
      distanceKm,
    };
  }

  if (params.weatherVerdict === "SEVERE_WEATHER") {
    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: jurisdiction.label,
      badgeText: "EXEMPT · SEVERE WEATHER VERIFIED",
      reason:
        "Signed airport meteorology confirms weather exceeding operational thresholds.",
      distanceKm,
    };
  }

  if (params.weatherVerdict === "BORDERLINE_WEATHER") {
    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: jurisdiction.label,
      badgeText: "REVIEW NEEDED · BORDERLINE WEATHER",
      reason:
        "Wind or visibility fell in the borderline band. Cross-check official airport METAR before filing.",
      distanceKm,
    };
  }

  const isCancelled = params.delayStatus === "CANCELLED";

  if (!isCancelled && params.delayMinutes < 180) {
    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: jurisdiction.label,
      badgeText: `UNDER 3H THRESHOLD · ${params.delayMinutes}M DELAY`,
      reason:
        "Clear skies confirmed, but statutory cash compensation requires a 3+ hour arrival delay or cancellation.",
      distanceKm,
    };
  }

  // Distance tiers
  const eurTier: 250 | 400 | 600 =
    distanceKm > 3500 ? 600 : distanceKm > 1500 ? 400 : 250;
  const gbpTier: 220 | 350 | 520 =
    distanceKm > 3500 ? 520 : distanceKm > 1500 ? 350 : 220;

  if (jurisdiction.code === "EU261") {
    return {
      eligible: true,
      amountEur: eurTier,
      amount: eurTier,
      currency: "EUR",
      regulation: jurisdiction.label,
      badgeText: `${eurTier} EUR ELIGIBLE · ${jurisdiction.label}`,
      reason: isCancelled
        ? `Flight cancelled under clear skies (${distanceKm.toLocaleString("en-US")} km route, ${jurisdiction.label} statutory band).`
        : `Great-circle distance of ${distanceKm.toLocaleString("en-US")} km with ${params.delayMinutes} min arrival delay under clear skies.`,
      distanceKm,
    };
  }

  if (jurisdiction.code === "UK261") {
    return {
      eligible: true,
      amountEur: eurTier,
      amount: gbpTier,
      currency: "GBP",
      regulation: "UK261",
      badgeText: `${gbpTier} GBP ELIGIBLE · UK261`,
      reason: isCancelled
        ? `Flight cancelled under clear skies (${distanceKm.toLocaleString("en-US")} km route, UK261 statutory band).`
        : `Great-circle distance of ${distanceKm.toLocaleString("en-US")} km with ${params.delayMinutes} min arrival delay under UK261.`,
      distanceKm,
    };
  }

  if (jurisdiction.code === "SHY_PASSENGER") {
    if (isCancelled) {
      const shyAmount: 100 | 250 | 400 | 600 = jurisdiction.isDomesticTr
        ? 100
        : eurTier;
      return {
        eligible: true,
        amountEur: shyAmount,
        amount: shyAmount,
        currency: "EUR",
        regulation: "SHY-PASSENGER",
        badgeText: `${shyAmount} EUR ELIGIBLE · SHY-PASSENGER`,
        reason: `Cancelled under clear skies (${distanceKm.toLocaleString("en-US")} km). Turkish SHY-Passenger statutory cancellation compensation applies.`,
        distanceKm,
      };
    }

    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: "SHY-PASSENGER",
      badgeText: "SHY-PASSENGER · CARE & REFUND RECORD",
      reason:
        "Clear skies verified. Turkish SHY-Passenger covers meals, hotel, and refund rights for 3h+ delays; cash compensation applies primarily to cancellations.",
      distanceKm,
    };
  }

  if (jurisdiction.code === "US_DOT") {
    return {
      eligible: false,
      amountEur: 0,
      amount: 0,
      currency: "NONE",
      regulation: "US DOT",
      badgeText: isCancelled
        ? "US DOT · AUTOMATIC CASH REFUND ELIGIBLE"
        : "US DOT · REFUND & CARE EVIDENCE",
      reason:
        "Clear skies verified. US DOT rules mandate automatic refunds for cancellations/significant delays and support airline meal/hotel commitments.",
      distanceKm,
    };
  }

  return {
    eligible: false,
    amountEur: 0,
    amount: 0,
    currency: "NONE",
    regulation: "PASSENGER RIGHTS",
    badgeText: "CLEAR-SKY EVIDENCE RECORD",
    reason:
      "Clear skies cryptographically verified. Route sits outside EU261 / UK261 jurisdiction; use this receipt for airline claims or travel insurance.",
    distanceKm,
  };
}

export function buildPaAnnouncementScript(params: {
  flightNumber: string;
  delayMinutes: number;
  delayStatus: DelayStatus;
  delayBasis: DelayBasis;
  weatherVerdict: WeatherVerdictCode;
  departureWeather: AirportWeatherSnapshot;
  compensation: CompensationEstimate;
}): string {
  const spacedFlight = params.flightNumber.replace(/([A-Z]+)(\d+)/, "$1 $2");

  if (params.delayStatus === "ON_TIME") {
    return `Attention, passengers of flight ${spacedFlight}. Cryptographically signed aviation telemetry confirms your flight operated on time. No weather dispute or compensation claim is triggered.`;
  }

  const isCancelled = params.delayStatus === "CANCELLED";
  const delayPhrase = formatDelaySpeech(params.delayMinutes);
  const timingVerb =
    params.delayBasis === "DEPARTURE_DELAY" ? "departed" : "arrived";
  const eventSentence = isCancelled
    ? "Your flight was cancelled."
    : `Your flight ${timingVerb} ${delayPhrase}.`;

  if (params.weatherVerdict === "SEVERE_WEATHER") {
    return `Attention, passengers of flight ${spacedFlight}. ${eventSentence} Signed meteorological records confirm severe weather conditions at the airport. Extraordinary weather circumstances apply.`;
  }

  if (params.weatherVerdict === "BORDERLINE_WEATHER") {
    return `Attention, passengers of flight ${spacedFlight}. ${eventSentence} Signed weather telemetry logged borderline wind or visibility at ${params.departureWeather.airportIata}. Additional review is recommended before filing your claim.`;
  }

  const currencyWord =
    params.compensation.currency === "GBP" ? "Pound" : "Euro";
  const claimAmt = params.compensation.amount ?? params.compensation.amountEur;
  const claimSentence =
    params.compensation.eligible && claimAmt > 0
      ? `Your ${claimAmt} ${currencyWord} ${params.compensation.regulation} compensation claim is now on the record.`
      : `Clear skies are now cryptographically logged on the record for your passenger claim.`;

  return `Attention, passengers of flight ${spacedFlight}. ${eventSentence} Cryptographically signed telemetry confirms ${params.departureWeather.conditionLabel.toLowerCase()} and ${params.departureWeather.windKt} knot winds at departure. ${claimSentence}`;
}

export function buildDelayVerdict(params: {
  flightNumber: string;
  flightStatusRaw?: string | null;
  departure: AirportInfo;
  arrival: AirportInfo;
  airlineRegion: "EU" | "UK" | "TR" | "US" | "INTL";
  scheduledDepartureUtc: string;
  actualDepartureUtc: string | null;
  scheduledArrivalUtc: string;
  actualArrivalUtc: string | null;
  departureWeather: AirportWeatherSnapshot;
  arrivalWeather: AirportWeatherSnapshot;
}): DelayVerdict {
  const delay = computeDelay({
    flightStatusRaw: params.flightStatusRaw,
    scheduledArrivalUtc: params.scheduledArrivalUtc,
    actualArrivalUtc: params.actualArrivalUtc,
    scheduledDepartureUtc: params.scheduledDepartureUtc,
    actualDepartureUtc: params.actualDepartureUtc,
  });

  const weather = evaluateWeatherExcuse(
    params.departureWeather,
    params.arrivalWeather
  );

  const compensation = estimateCompensation({
    delayMinutes: delay.delayMinutes,
    delayStatus: delay.delayStatus,
    weatherVerdict: weather.verdict,
    departure: params.departure,
    arrival: params.arrival,
    airlineRegion: params.airlineRegion,
  });

  let stampTitle = "NOT WEATHER · CLEAR SKIES";
  let stampSubtitle = "AIRLINE EXCUSE DEBUNKED";
  let stampTone: "red" | "amber" | "green" = "red";

  if (delay.delayStatus === "ON_TIME") {
    stampTitle = "ON TIME · VERIFIED";
    stampSubtitle = "UNDER 15 MIN THRESHOLD";
    stampTone = "green";
  } else if (weather.verdict === "SEVERE_WEATHER") {
    stampTitle = "SEVERE WEATHER CONFIRMED";
    stampSubtitle = "METEOROLOGICAL THRESHOLD EXCEEDED";
    stampTone = "amber";
  } else if (weather.verdict === "BORDERLINE_WEATHER") {
    stampTitle = "BORDERLINE WEATHER · REVIEW NEEDED";
    stampSubtitle = "ELEVATED WIND OR REDUCED VISIBILITY";
    stampTone = "amber";
  } else if (delay.delayStatus === "CANCELLED") {
    stampTitle = "CANCELLED · CLEAR SKIES";
    stampSubtitle = "NOT WEATHER · EXCUSE DEBUNKED";
    stampTone = "red";
  }

  const paScript = buildPaAnnouncementScript({
    flightNumber: params.flightNumber,
    delayMinutes: delay.delayMinutes,
    delayStatus: delay.delayStatus,
    delayBasis: delay.delayBasis,
    weatherVerdict: weather.verdict,
    departureWeather: params.departureWeather,
    compensation,
  });

  return {
    delayMinutes: delay.delayMinutes,
    delayFormatted: delay.delayFormatted,
    delayStatus: delay.delayStatus,
    delayBasis: delay.delayBasis,
    weatherVerdict: weather.verdict,
    weatherTriggerReason: weather.triggerReason,
    stampTitle,
    stampSubtitle,
    stampTone,
    weatherSummary: weather.summary,
    compensation,
    paScript,
    disclaimer:
      "Cryptographic telemetry evidence for passenger compensation claims. Not legal advice.",
  };
}

/** Generates deterministic barcode bar widths (1..3 units) from a hex signature/hash */
export function generateDeterministicBarcode(
  hexSeed: string,
  barCount = 44
): Array<{ width: number; filled: boolean }> {
  const cleaned = hexSeed.replace(/^0x/i, "").toLowerCase() || "a1b2c3d4e5f6";
  const bars: Array<{ width: number; filled: boolean }> = [];

  for (let i = 0; i < barCount; i++) {
    const nibble = parseInt(cleaned[i % cleaned.length], 16);
    const prevNibble = parseInt(
      cleaned[(i * 3 + 7) % cleaned.length],
      16
    );
    const width = ((nibble + prevNibble) % 3) + 1;
    bars.push({
      width,
      filled: i % 2 === 0,
    });
  }
  return bars;
}

export function formatUtcTime(isoString: string | null): string {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "N/A";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}
