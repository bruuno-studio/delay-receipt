import {
  buildProofFromDemoScenario,
  DEMO_SCENARIOS,
  isDemoMode,
} from "./airnodehub";
import {
  getD1Database,
  getServerSecret,
  type D1DatabaseLike,
} from "./cfEnv";
import { evaluateWeatherExcuse } from "./rules";
import type {
  FlightProofRecord,
  FunnelEvent,
  FunnelEventType,
  MetricsSnapshot,
} from "./types";

interface RateLimitBucket {
  ip: string;
  timestamps: number[];
}

interface StoreData {
  seededDemo: boolean;
  proofs: Record<string, FlightProofRecord>;
  cacheIndex: Record<string, string>;
  events: FunnelEvent[];
  rateLimits: Record<string, RateLimitBucket>;
}

const globalForStore = globalThis as unknown as {
  __delayReceiptStore?: StoreData;
  __delayReceiptSeedPromise?: Promise<void>;
  __delayReceiptD1SchemaReady?: boolean;
  __delayReceiptD1Seeded?: boolean;
};

async function ensureD1Schema(db: D1DatabaseLike): Promise<void> {
  if (globalForStore.__delayReceiptD1SchemaReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      flight_number TEXT NOT NULL,
      flight_date TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      delay_minutes INTEGER NOT NULL,
      weather_verdict TEXT NOT NULL,
      featured_on_shame_wall INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_proofs_cache_key ON proofs(cache_key)`,
    `CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs(created_at_utc DESC)`,
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      proof_id TEXT,
      timestamp_utc TEXT NOT NULL,
      cost_usd REAL DEFAULT 0,
      meta_json TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp_utc DESC)`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      expires_at_ms INTEGER NOT NULL
    )`,
  ];
  for (const sql of statements) {
    await db.prepare(sql).run();
  }
  globalForStore.__delayReceiptD1SchemaReady = true;
}

function createEmptyStore(): StoreData {
  return {
    seededDemo: false,
    proofs: {},
    cacheIndex: {},
    events: [],
    rateLimits: {},
  };
}

function normalizeLoadedProof(proof: FlightProofRecord): FlightProofRecord {
  if (!proof.verdict.weatherTriggerReason) {
    const evalRes = evaluateWeatherExcuse(
      proof.departureWeather,
      proof.arrivalWeather
    );
    proof.verdict.weatherTriggerReason = evalRes.triggerReason;
  }
  return proof;
}

/** Node.js filesystem helper loaded lazily so Cloudflare Workers never fail at import time */
async function loadLocalStore(): Promise<StoreData> {
  if (globalForStore.__delayReceiptStore) {
    return globalForStore.__delayReceiptStore;
  }

  try {
    const fsMod = await import("fs");
    const pathMod = await import("path");
    const storePath = pathMod.join(
      process.cwd(),
      ".data",
      "delay-receipt-store.json"
    );
    if (fsMod.existsSync(storePath)) {
      const raw = fsMod.readFileSync(storePath, "utf8");
      const parsed = JSON.parse(raw) as StoreData;
      globalForStore.__delayReceiptStore = {
        seededDemo: Boolean(parsed.seededDemo),
        proofs: parsed.proofs || {},
        cacheIndex: parsed.cacheIndex || {},
        events: Array.isArray(parsed.events) ? parsed.events : [],
        rateLimits: parsed.rateLimits || {},
      };
      return globalForStore.__delayReceiptStore;
    }
  } catch {
    // No writable filesystem (e.g. Workers without D1 binding): use in-memory store
  }

  const fresh = createEmptyStore();
  globalForStore.__delayReceiptStore = fresh;
  return fresh;
}

async function persistLocalStore(store: StoreData): Promise<void> {
  globalForStore.__delayReceiptStore = store;
  try {
    const fsMod = await import("fs");
    const pathMod = await import("path");
    const dataDir = pathMod.join(process.cwd(), ".data");
    const storePath = pathMod.join(dataDir, "delay-receipt-store.json");
    if (!fsMod.existsSync(dataDir)) {
      fsMod.mkdirSync(dataDir, { recursive: true });
    }
    fsMod.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Ignore on read-only runtimes
  }
}

async function seedD1IfNeeded(db: D1DatabaseLike): Promise<void> {
  await ensureD1Schema(db);
  if (globalForStore.__delayReceiptD1Seeded || !isDemoMode()) return;

  const existing = await db
    .prepare("SELECT COUNT(*) as cnt FROM proofs")
    .first<{ cnt: number }>();

  if (existing && Number(existing.cnt) > 0) {
    globalForStore.__delayReceiptD1Seeded = true;
    return;
  }

  const builtProofs = await Promise.all(
    DEMO_SCENARIOS.map((scenario) => buildProofFromDemoScenario(scenario))
  );

  for (const proof of builtProofs) {
    await saveProofToD1(db, proof);
    await db
      .prepare(
        "INSERT OR IGNORE INTO events (id, type, proof_id, timestamp_utc, cost_usd, meta_json) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        `seed-card-${proof.id}`,
        "cards_generated",
        proof.id,
        proof.createdAtUtc,
        0,
        JSON.stringify({ mode: "DEMO", flightNumber: proof.flightNumber })
      )
      .run();
    await db
      .prepare(
        "INSERT OR IGNORE INTO events (id, type, proof_id, timestamp_utc, cost_usd, meta_json) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        `seed-api-${proof.id}`,
        "airnodehub_calls",
        proof.id,
        proof.createdAtUtc,
        proof.totalApiCostUsd,
        JSON.stringify({ callCount: proof.attestations.length, mode: "DEMO" })
      )
      .run();
  }

  globalForStore.__delayReceiptD1Seeded = true;
}

async function saveProofToD1(
  db: D1DatabaseLike,
  proof: FlightProofRecord
): Promise<void> {
  await ensureD1Schema(db);
  await db
    .prepare(
      `INSERT OR REPLACE INTO proofs (
        id, cache_key, flight_number, flight_date, created_at_utc,
        delay_minutes, weather_verdict, featured_on_shame_wall, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      proof.id,
      proof.cacheKey,
      proof.flightNumber,
      proof.flightDate,
      proof.createdAtUtc,
      proof.verdict.delayMinutes,
      proof.verdict.weatherVerdict,
      proof.featuredOnShameWall ? 1 : 0,
      JSON.stringify(proof)
    )
    .run();
}

async function ensureLocalSeeded(): Promise<StoreData> {
  const store = await loadLocalStore();
  if (store.seededDemo || !isDemoMode()) {
    return store;
  }

  if (!globalForStore.__delayReceiptSeedPromise) {
    globalForStore.__delayReceiptSeedPromise = (async () => {
      const builtProofs = await Promise.all(
        DEMO_SCENARIOS.map((scenario) => buildProofFromDemoScenario(scenario))
      );

      for (const proof of builtProofs) {
        store.proofs[proof.id] = proof;
        store.cacheIndex[proof.cacheKey] = proof.id;

        if (store.events.length < 25) {
          store.events.push({
            id: `seed-card-${proof.id}`,
            type: "cards_generated",
            proofId: proof.id,
            timestampUtc: proof.createdAtUtc,
            costUsd: 0,
            meta: { mode: "DEMO", flightNumber: proof.flightNumber },
          });
          store.events.push({
            id: `seed-api-${proof.id}`,
            type: "airnodehub_calls",
            proofId: proof.id,
            timestampUtc: proof.createdAtUtc,
            costUsd: proof.totalApiCostUsd,
            meta: { callCount: proof.attestations.length, mode: "DEMO" },
          });
        }
      }

      store.seededDemo = true;
      await persistLocalStore(store);
    })();
  }

  await globalForStore.__delayReceiptSeedPromise;
  return store;
}

export async function getProofById(
  id: string
): Promise<FlightProofRecord | null> {
  const db = await getD1Database();
  if (db) {
    await seedD1IfNeeded(db);
    const row = await db
      .prepare("SELECT payload_json FROM proofs WHERE id = ? OR id = ? LIMIT 1")
      .bind(id, id.toLowerCase())
      .first<{ payload_json: string }>();
    if (!row?.payload_json) return null;
    return normalizeLoadedProof(JSON.parse(row.payload_json) as FlightProofRecord);
  }

  const store = await ensureLocalSeeded();
  const found = store.proofs[id] || store.proofs[id.toLowerCase()] || null;
  return found ? normalizeLoadedProof(found) : null;
}

export async function getProofByCacheKey(
  cacheKey: string
): Promise<FlightProofRecord | null> {
  const db = await getD1Database();
  if (db) {
    await seedD1IfNeeded(db);
    const row = await db
      .prepare("SELECT payload_json FROM proofs WHERE cache_key = ? LIMIT 1")
      .bind(cacheKey)
      .first<{ payload_json: string }>();
    if (!row?.payload_json) return null;
    return normalizeLoadedProof(JSON.parse(row.payload_json) as FlightProofRecord);
  }

  const store = await ensureLocalSeeded();
  const id = store.cacheIndex[cacheKey];
  if (!id) return null;
  const found = store.proofs[id] || null;
  return found ? normalizeLoadedProof(found) : null;
}

export async function saveProof(proof: FlightProofRecord): Promise<void> {
  const db = await getD1Database();
  if (db) {
    await saveProofToD1(db, proof);
    return;
  }

  const store = await ensureLocalSeeded();
  store.proofs[proof.id] = proof;
  store.cacheIndex[proof.cacheKey] = proof.id;
  await persistLocalStore(store);
}

export async function getShameWallProofs(
  limit = 4
): Promise<FlightProofRecord[]> {
  const db = await getD1Database();
  if (db) {
    await seedD1IfNeeded(db);
    const rows = await db
      .prepare(
        `SELECT payload_json FROM proofs
         ORDER BY
           featured_on_shame_wall DESC,
           CASE WHEN weather_verdict = 'NOT_WEATHER' AND delay_minutes >= 180 THEN 1 ELSE 0 END DESC,
           delay_minutes DESC,
           created_at_utc DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{ payload_json: string }>();

    return (rows.results || []).map((r) =>
      normalizeLoadedProof(JSON.parse(r.payload_json) as FlightProofRecord)
    );
  }

  const store = await ensureLocalSeeded();
  const all = Object.values(store.proofs).map(normalizeLoadedProof);

  const featured = all
    .filter(
      (p) =>
        p.featuredOnShameWall ||
        (p.verdict.weatherVerdict === "NOT_WEATHER" &&
          (p.verdict.delayMinutes >= 180 || p.verdict.delayStatus === "CANCELLED"))
    )
    .sort((a, b) => {
      if (a.featuredOnShameWall && !b.featuredOnShameWall) return -1;
      if (!a.featuredOnShameWall && b.featuredOnShameWall) return 1;
      return b.verdict.delayMinutes - a.verdict.delayMinutes;
    });

  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }

  const used = new Set(featured.map((p) => p.id));
  const recentOthers = all
    .filter((p) => !used.has(p.id))
    .sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc));

  return [...featured, ...recentOthers].slice(0, limit);
}

export async function recordEvent(input: {
  type: FunnelEventType;
  proofId?: string;
  costUsd?: number;
  meta?: Record<string, string | number | boolean>;
}): Promise<FunnelEvent> {
  const evt: FunnelEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    proofId: input.proofId,
    timestampUtc: new Date().toISOString(),
    costUsd: input.costUsd,
    meta: input.meta,
  };

  const db = await getD1Database();
  if (db) {
    await ensureD1Schema(db);
    await db
      .prepare(
        "INSERT INTO events (id, type, proof_id, timestamp_utc, cost_usd, meta_json) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        evt.id,
        evt.type,
        evt.proofId ?? null,
        evt.timestampUtc,
        evt.costUsd ?? 0,
        evt.meta ? JSON.stringify(evt.meta) : null
      )
      .run();
    return evt;
  }

  const store = await ensureLocalSeeded();
  store.events.push(evt);
  if (store.events.length > 5000) {
    store.events = store.events.slice(-5000);
  }
  await persistLocalStore(store);
  return evt;
}

/**
 * Distributed IP rate limiter (default: 10 uncached live lookups per hour per IP).
 * Uses atomic Cloudflare D1 bucket upsert in production and sliding-window locally.
 */
export async function checkAndConsumeRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const maxRaw = (await getServerSecret("RATE_LIMIT_MAX_PER_HOUR")) || "10";
  const maxPerHour = Math.max(1, Number(maxRaw) || 10);
  const effectiveMax = isDemoMode() ? Math.max(maxPerHour * 6, 60) : maxPerHour;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const keyIp = (ip || "unknown").slice(0, 64);

  const db = await getD1Database();
  if (db) {
    await ensureD1Schema(db);
    const hourSlot = Math.floor(now / windowMs);
    const bucketKey = `${keyIp}:${hourSlot}`;
    const expiresAtMs = (hourSlot + 1) * windowMs;

    // Best-effort purge of expired buckets
    await db
      .prepare("DELETE FROM rate_limits WHERE expires_at_ms < ?")
      .bind(now)
      .run()
      .catch(() => {});

    const existing = await db
      .prepare("SELECT count FROM rate_limits WHERE bucket_key = ?")
      .bind(bucketKey)
      .first<{ count: number }>();

    const currentCount = existing ? Number(existing.count) : 0;
    const resetInSeconds = Math.max(1, Math.ceil((expiresAtMs - now) / 1000));

    if (currentCount >= effectiveMax) {
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    await db
      .prepare(
        `INSERT INTO rate_limits (bucket_key, count, expires_at_ms)
         VALUES (?, 1, ?)
         ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1`
      )
      .bind(bucketKey, expiresAtMs)
      .run();

    return {
      allowed: true,
      remaining: Math.max(0, effectiveMax - (currentCount + 1)),
      resetInSeconds,
    };
  }

  const store = await ensureLocalSeeded();
  const bucket = store.rateLimits[keyIp] || { ip: keyIp, timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= effectiveMax) {
    const oldest = bucket.timestamps[0];
    const resetInSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    store.rateLimits[keyIp] = bucket;
    await persistLocalStore(store);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  bucket.timestamps.push(now);
  store.rateLimits[keyIp] = bucket;
  await persistLocalStore(store);

  return {
    allowed: true,
    remaining: Math.max(0, effectiveMax - bucket.timestamps.length),
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

function buildMetricsFromData(
  events: FunnelEvent[],
  proofs: FlightProofRecord[]
): MetricsSnapshot {
  let cardsGenerated = 0;
  let airnodehubCalls = 0;
  let estimatedSpendUsd = 0;
  let xShareClicks = 0;
  let proofViews = 0;
  let signatureChecks = 0;
  let mcpConfigCopies = 0;
  let pngDownloads = 0;
  let claimEmailCopies = 0;
  let voicePlays = 0;

  const dailyMap = new Map<
    string,
    { cards: number; shares: number; views: number; verifications: number }
  >();

  const ensureDay = (day: string) => {
    let row = dailyMap.get(day);
    if (!row) {
      row = { cards: 0, shares: 0, views: 0, verifications: 0 };
      dailyMap.set(day, row);
    }
    return row;
  };

  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    ensureDay(d.toISOString().slice(0, 10));
  }

  for (const e of events) {
    const day = e.timestampUtc.slice(0, 10);
    const bucket = ensureDay(day);

    switch (e.type) {
      case "cards_generated":
        cardsGenerated += 1;
        bucket.cards += 1;
        break;
      case "airnodehub_calls": {
        const count =
          typeof e.meta?.callCount === "number" ? e.meta.callCount : 1;
        airnodehubCalls += count;
        estimatedSpendUsd += e.costUsd ?? 0;
        break;
      }
      case "x_share_clicks":
        xShareClicks += 1;
        bucket.shares += 1;
        break;
      case "proof_views":
        proofViews += 1;
        bucket.views += 1;
        break;
      case "signature_checks":
        signatureChecks += 1;
        bucket.verifications += 1;
        break;
      case "mcp_config_copies":
        mcpConfigCopies += 1;
        break;
      case "png_downloads":
        pngDownloads += 1;
        break;
      case "claim_email_copies":
        claimEmailCopies += 1;
        break;
      case "voice_plays":
        voicePlays += 1;
        break;
    }
  }

  const xShareConversionPct =
    cardsGenerated > 0
      ? Number(((xShareClicks / cardsGenerated) * 100).toFixed(1))
      : 0;

  const dailyActivity = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-10)
    .map(([date, counts]) => ({ date, ...counts }));

  const recentProofs = proofs
    .sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      flightNumber: p.flightNumber,
      flightDate: p.flightDate,
      route: `${p.departure.iata} -> ${p.arrival.iata}`,
      airlineName: p.airlineName,
      delayFormatted: p.verdict.delayFormatted,
      delayMinutes: p.verdict.delayMinutes,
      weatherVerdict: p.verdict.weatherVerdict,
      stampTitle: p.verdict.stampTitle,
      claimBadge: p.verdict.compensation.badgeText,
      mode: p.mode,
      createdAtUtc: p.createdAtUtc,
      costUsd: p.totalApiCostUsd,
    }));

  return {
    totals: {
      cardsGenerated,
      airnodehubCalls,
      estimatedSpendUsd: Number(estimatedSpendUsd.toFixed(4)),
      xShareClicks,
      xShareConversionPct,
      proofViews,
      signatureChecks,
      mcpConfigCopies,
      pngDownloads,
      claimEmailCopies,
      voicePlays,
    },
    dailyActivity,
    recentProofs,
  };
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const db = await getD1Database();
  if (db) {
    await seedD1IfNeeded(db);
    const [evtRows, proofRows] = await Promise.all([
      db
        .prepare(
          "SELECT id, type, proof_id, timestamp_utc, cost_usd, meta_json FROM events ORDER BY timestamp_utc DESC LIMIT 5000"
        )
        .all<{
          id: string;
          type: FunnelEventType;
          proof_id: string | null;
          timestamp_utc: string;
          cost_usd: number | null;
          meta_json: string | null;
        }>(),
      db
        .prepare(
          "SELECT payload_json FROM proofs ORDER BY created_at_utc DESC LIMIT 20"
        )
        .all<{ payload_json: string }>(),
    ]);

    const events: FunnelEvent[] = (evtRows.results || []).map((r) => ({
      id: r.id,
      type: r.type,
      proofId: r.proof_id ?? undefined,
      timestampUtc: r.timestamp_utc,
      costUsd: r.cost_usd ?? 0,
      meta: r.meta_json
        ? (JSON.parse(r.meta_json) as Record<string, string | number | boolean>)
        : undefined,
    }));

    const proofs: FlightProofRecord[] = (proofRows.results || []).map((r) =>
      normalizeLoadedProof(JSON.parse(r.payload_json) as FlightProofRecord)
    );

    return buildMetricsFromData(events, proofs);
  }

  const store = await ensureLocalSeeded();
  return buildMetricsFromData(
    store.events,
    Object.values(store.proofs).map(normalizeLoadedProof)
  );
}
