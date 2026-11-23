# DELAY RECEIPT

Cryptographically signed airline delay proof receipts powered by **API3 AirnodeHub**, **x402 micropayments**, and **EIP-191 attestations**.

Enter any delayed or cancelled flight (flight number + date) to verify airport meteorology and arrival timestamps from first-party signed telemetry, debunk false weather excuses, and generate a shareable boarding pass receipt with statutory passenger rights analysis (EU261 / UK261 / SHY-Passenger / US DOT).

## Key Features

- **Signed Boarding Pass Receipt (`/proof/[id]`):** Archival paper boarding pass UI with oversized delay counter, departure and arrival airport meteorology, transparent rule trigger audit strip, tilted ink verdict stamp, statutory compensation band, deterministic signature hash barcode, and AirnodeHub cryptographic seal.
- **One-Click Viral & Claim Tools:** Pre-filled `x.com/intent/post` composer tagging the airline handle, crisp `1600x840` client-side PNG download (zero server CPU), dynamic `1200x630` Open Graph social card (`/api/og/[id]`), copyable passenger claim demand email modal, and Web Audio API terminal PA verdict announcement (2-tone chime + `300Hz` to `3400Hz` bandpass speaker filter).
- **Client-Side EIP-191 Cryptographic Verification:** Inspect raw AeroDataBox and Open-Meteo / Visual Crossing JSON payloads, canonical `requestHash`, UTC timestamps, Base Sepolia x402 settlement transactions, and verify secp256k1 signatures locally in the browser using `viem`.
- **Zero-Wallet End-User UX:** Server-side x402 v2 EIP-3009 `aUSD` payments on Base Sepolia (`eip155:84532`) with global `flightNumber + date` response caching and per-IP hourly rate limiting backed by Cloudflare D1.
- **Funnel & Attestation Telemetry (`/metrics`):** Live dashboard tracking generated cards, AirnodeHub API calls and aUSD spend, X share conversion rate, proof views, signature verifications, and developer MCP config copies.

## AirnodeHub Data Sources

- **Flight Telemetry:** [AeroDataBox](https://airnodes.api3.org/aerodatabox/) (`flightStatusOnDate`, `airportSchedule`)
- **Airport Meteorology:** [Open-Meteo](https://airnodes.api3.org/open-meteo/) (`forecast`, `historicalForecast`) or [Visual Crossing](https://airnodes.api3.org/visualcrossing/) (`getTimelinePeriod`)
- **MCP Endpoint:** `https://airnodehub.api3.org/mcp`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

By default `DEMO_MODE=true` serves 5 pre-built, EIP-191 signed delayed flight scenarios at zero API cost.

To enable live AirnodeHub x402 lookups locally, set in `.env.local` (never committed):

```env
DEMO_MODE=false
AIRNODEHUB_WALLET_PRIVATE_KEY=0xYOUR_BASE_SEPOLIA_TESTNET_PRIVATE_KEY
```

Mint free Base Sepolia `aUSD` at `https://airnodehub.api3.org/faucet`.

## Deploying Free on Cloudflare Workers + D1

1. Create a free Cloudflare D1 database and apply `migrations/0001_init.sql`.
2. Update `wrangler.jsonc` with your D1 `database_id` and `NEXT_PUBLIC_APP_URL`.
3. Connect the repository to **Cloudflare Workers** (`Workers & Pages -> Create -> Import a repository`):
   - **Build command:** `npm run build:vinext`
   - **Deploy command:** `npx wrangler deploy --config dist/server/wrangler.json`
4. Add secrets strictly in **Cloudflare Dashboard -> Settings -> Variables and Secrets (Type: Secret)**:
   - `AIRNODEHUB_WALLET_PRIVATE_KEY` (testnet-only burner wallet)
   - `SCAN_SECRET` (optional, protects `POST /api/scan-shame-wall`)
   - `METRICS_ACCESS_KEY` (optional, gates `/metrics?key=...`)

## Disclaimer

Delay Receipt provides cryptographically signed aviation and meteorological telemetry as factual evidence for passenger claims. It does not constitute legal advice.
