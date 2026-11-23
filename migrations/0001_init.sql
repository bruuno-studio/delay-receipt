-- Delay Receipt Cloudflare D1 Schema (Free Tier Compatible)
CREATE TABLE IF NOT EXISTS proofs (
  id TEXT PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  flight_number TEXT NOT NULL,
  flight_date TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL,
  weather_verdict TEXT NOT NULL,
  featured_on_shame_wall INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proofs_cache_key ON proofs(cache_key);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs(created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_shame ON proofs(featured_on_shame_wall DESC, delay_minutes DESC);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  proof_id TEXT,
  timestamp_utc TEXT NOT NULL,
  cost_usd REAL DEFAULT 0,
  meta_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at_ms INTEGER NOT NULL
);
