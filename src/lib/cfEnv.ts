/**
 * Runtime-safe Cloudflare Workers binding & server secret accessor.
 * Works seamlessly on Cloudflare Workers (vinext / OpenNext / workerd) AND Node.js local dev.
 * Server-only: NEVER import this module from any "use client" component.
 */

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface CloudflareRuntimeEnv {
  DB?: D1DatabaseLike;
  DEMO_MODE?: string;
  AIRNODEHUB_WALLET_PRIVATE_KEY?: string;
  AIRNODEHUB_WEATHER_PROVIDER?: string;
  AIRNODEHUB_MAX_USD_PER_LOOKUP?: string;
  RATE_LIMIT_MAX_PER_HOUR?: string;
  METRICS_ACCESS_KEY?: string;
  SCAN_SECRET?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TTS_VOICE?: string;
  NEXT_PUBLIC_APP_URL?: string;
  [key: string]: unknown;
}

let cachedWorkersEnv: CloudflareRuntimeEnv | null | undefined = undefined;

export async function getCloudflareEnv(): Promise<CloudflareRuntimeEnv | null> {
  if (cachedWorkersEnv !== undefined) {
    return cachedWorkersEnv;
  }

  // 1. Check OpenNext / Cloudflare global context symbol if present
  const g = globalThis as Record<PropertyKey, unknown>;
  const cfCtx = g[Symbol.for("__cloudflare-context__")] as
    | { env?: CloudflareRuntimeEnv }
    | undefined;
  if (cfCtx?.env) {
    return cfCtx.env;
  }

  // 2. Check custom global worker env hook if present
  if (g.__CLOUDFLARE_ENV__ && typeof g.__CLOUDFLARE_ENV__ === "object") {
    return g.__CLOUDFLARE_ENV__ as CloudflareRuntimeEnv;
  }

  // 3. Check native `cloudflare:workers` virtual module (vinext / workerd)
  try {
    const modName = "cloudflare:workers";
    const mod = (await import(/* webpackIgnore: true */ modName)) as {
      env?: CloudflareRuntimeEnv;
    };
    if (mod?.env) {
      cachedWorkersEnv = mod.env;
      return mod.env;
    }
  } catch {
    // Running on Node.js outside workerd
  }

  cachedWorkersEnv = null;
  return null;
}

export async function getServerSecret(name: string): Promise<string | undefined> {
  const cfEnv = await getCloudflareEnv();
  const fromCf = cfEnv?.[name];
  if (typeof fromCf === "string" && fromCf.trim() !== "") {
    return fromCf.trim();
  }
  const fromNode = process.env[name];
  if (typeof fromNode === "string" && fromNode.trim() !== "") {
    return fromNode.trim();
  }
  return undefined;
}

export async function getD1Database(): Promise<D1DatabaseLike | null> {
  const cfEnv = await getCloudflareEnv();
  if (cfEnv?.DB && typeof cfEnv.DB.prepare === "function") {
    return cfEnv.DB;
  }
  return null;
}
