export type WeatherVerdictCode =
  | "NOT_WEATHER"
  | "BORDERLINE_WEATHER"
  | "SEVERE_WEATHER";

export type DelayStatus = "DELAYED" | "ON_TIME" | "CANCELLED";

export type DelayBasis = "ARRIVAL_DELAY" | "DEPARTURE_DELAY" | "CANCELLED";

export type DataMode = "DEMO" | "LIVE";

export interface AirportInfo {
  iata: string;
  icao: string;
  name: string;
  municipality: string;
  countryCode: string;
  lat: number;
  lon: number;
  terminal?: string | null;
  gate?: string | null;
}

export interface AirportWeatherSnapshot {
  airportIata: string;
  airportName: string;
  observedWindowUtc: string;
  windKt: number;
  gustKt: number;
  visibilityKm: number;
  precipitationMm: number;
  temperatureC: number;
  weatherCode: number;
  conditionLabel: string;
  isSevereCode: boolean;
  provider: string;
}

export interface AirnodeAttestationRecord {
  id: string;
  role: "flight_status" | "departure_weather" | "arrival_weather";
  providerSlug: string;
  providerName: string;
  listingUrl: string;
  operation: string;
  parameters: Record<string, unknown>;
  /** Exact AirnodeHub signed envelope fields */
  airnode: `0x${string}`;
  requestHash: `0x${string}`;
  timestamp: string;
  data: string;
  signature: `0x${string}`;
  priceUsd: number;
  settlementTx?: string | null;
  isDemoSigner: boolean;
}

export interface CompensationEstimate {
  eligible: boolean;
  amountEur: 0 | 100 | 250 | 400 | 600;
  amount?: number;
  currency?: "EUR" | "GBP" | "NONE";
  regulation: string;
  badgeText: string;
  reason: string;
  distanceKm: number;
}

export interface DelayVerdict {
  delayMinutes: number;
  delayFormatted: string;
  delayStatus: DelayStatus;
  delayBasis: DelayBasis;
  weatherVerdict: WeatherVerdictCode;
  weatherTriggerReason?: string;
  stampTitle: string;
  stampSubtitle: string;
  stampTone: "red" | "amber" | "green";
  weatherSummary: string;
  compensation: CompensationEstimate;
  paScript: string;
  disclaimer: string;
}

export interface FlightProofRecord {
  id: string;
  cacheKey: string;
  createdAtUtc: string;
  mode: DataMode;
  flightNumber: string;
  flightDate: string;
  airlineIata: string;
  airlineName: string;
  airlineHandle: string;
  aircraftModel: string;
  flightStatusRaw: string;
  departure: AirportInfo;
  arrival: AirportInfo;
  scheduledDepartureUtc: string;
  actualDepartureUtc: string | null;
  scheduledArrivalUtc: string;
  actualArrivalUtc: string | null;
  departureWeather: AirportWeatherSnapshot;
  arrivalWeather: AirportWeatherSnapshot;
  verdict: DelayVerdict;
  attestations: AirnodeAttestationRecord[];
  signatureDigestShort: string;
  totalApiCostUsd: number;
  featuredOnShameWall?: boolean;
}

export type FunnelEventType =
  | "cards_generated"
  | "airnodehub_calls"
  | "x_share_clicks"
  | "proof_views"
  | "signature_checks"
  | "mcp_config_copies"
  | "png_downloads"
  | "claim_email_copies"
  | "voice_plays";

export interface FunnelEvent {
  id: string;
  type: FunnelEventType;
  proofId?: string;
  timestampUtc: string;
  costUsd?: number;
  meta?: Record<string, string | number | boolean>;
}

export interface MetricsSnapshot {
  totals: {
    cardsGenerated: number;
    airnodehubCalls: number;
    estimatedSpendUsd: number;
    xShareClicks: number;
    xShareConversionPct: number;
    proofViews: number;
    signatureChecks: number;
    mcpConfigCopies: number;
    pngDownloads: number;
    claimEmailCopies: number;
    voicePlays: number;
  };
  dailyActivity: Array<{
    date: string;
    cards: number;
    shares: number;
    views: number;
    verifications: number;
  }>;
  recentProofs: Array<{
    id: string;
    flightNumber: string;
    flightDate: string;
    route: string;
    airlineName: string;
    delayFormatted: string;
    delayMinutes: number;
    weatherVerdict: WeatherVerdictCode;
    stampTitle: string;
    claimBadge: string;
    mode: DataMode;
    createdAtUtc: string;
    costUsd: number;
  }>;
}
