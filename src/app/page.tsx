import { FlightLookupForm } from "@/components/FlightLookupForm";
import { McpCopyBanner } from "@/components/McpCopyBanner";
import { ShameWall } from "@/components/ShameWall";
import { SiteHeader } from "@/components/SiteHeader";
import { isDemoMode } from "@/lib/airnodehub";
import { getShameWallProofs } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const demo = isDemoMode();
  const shameProofs = await getShameWallProofs(4);
  const nowUtc = new Date();
  const todayUtc = nowUtc.toISOString().slice(0, 10);
  const yesterdayUtc = new Date(nowUtc.getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const defaultDate = demo ? "2026-11-22" : yesterdayUtc;

  return (
    <div className="min-h-screen flex flex-col bg-[#111111] bg-grid-pattern">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Brutalist Aviation Header */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 items-end border-b border-[#2B2B2B] pb-7">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#D92D20] mb-3">
              <span className="w-2 h-2 bg-[#D92D20] inline-block" />
              <span>AIRLINE EXCUSE DEBUNKER · API3 AIRNODEHUB</span>
            </div>
            <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F3F1EA] leading-[1.03]">
              THEY BLAMED THE WEATHER.{" "}
              <span className="text-[#D92D20]">PRINT THE RECEIPT.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#B8B5AA] max-w-2xl leading-relaxed">
              Enter any delayed flight to pull cryptographically signed flight
              arrival telemetry and airport meteorology. Generate a shareable
              proof boarding pass and EU261 / UK261 claim record in seconds.
            </p>
          </div>

          <div className="grid grid-cols-3 border border-[#2B2B2B] bg-[#181818] divide-x divide-[#2B2B2B] font-mono">
            <div className="p-3.5">
              <div className="text-[10px] text-[#7D7B73] uppercase tracking-wider">
                WALLET
              </div>
              <div className="text-sm sm:text-base font-bold text-[#F3F1EA] mt-1">
                ZERO
              </div>
              <div className="text-[10px] text-[#8E8C84] mt-0.5">
                X402 SERVER PAY
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[10px] text-[#7D7B73] uppercase tracking-wider">
                ATTESTATION
              </div>
              <div className="text-sm sm:text-base font-bold text-[#16A34A] mt-1">
                EIP-191
              </div>
              <div className="text-[10px] text-[#8E8C84] mt-0.5">
                SIGNED JSON
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[10px] text-[#7D7B73] uppercase tracking-wider">
                CLAIM CAP
              </div>
              <div className="text-sm sm:text-base font-bold text-[#D92D20] mt-1">
                600 EUR
              </div>
              <div className="text-[10px] text-[#8E8C84] mt-0.5">
                EU261 / UK261
              </div>
            </div>
          </div>
        </section>

        {/* Entry Point 1: Flight Lookup Form */}
        <FlightLookupForm
          defaultDate={defaultDate}
          todayDate={todayUtc}
          yesterdayDate={yesterdayUtc}
          isDemo={demo}
        />

        {/* Entry Point 2: Today's Shame Wall (Immediate Above-the-Fold Clickable Proofs) */}
        <ShameWall proofs={shameProofs} />

        {/* Transparent Rules Threshold Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 border border-[#2B2B2B] bg-[#181818] divide-y md:divide-y-0 md:divide-x divide-[#2B2B2B] font-mono">
          <div className="p-5 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#D92D20] font-bold">
              01 · SIGNED FLIGHT TIMESTAMPS
            </div>
            <p className="text-xs text-[#A8A59B] leading-relaxed">
              Scheduled vs. actual arrival UTC pulled from AeroDataBox through
              AirnodeHub. Falls back to labeled departure delay when arrival
              feed is absent.
            </p>
          </div>
          <div className="p-5 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#F3F1EA] font-bold">
              02 · DETERMINISTIC WEATHER CHECK
            </div>
            <p className="text-xs text-[#A8A59B] leading-relaxed">
              Evaluates both origin and destination airports within a 1-hour
              window. Severe threshold: wind &gt; 35 kt, gusts &gt; 45 kt,
              visibility &lt; 1.5 km, or severe storm code.
            </p>
          </div>
          <div className="p-5 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#16A34A] font-bold">
              03 · VERIFIABLE PROOF RECEIPT
            </div>
            <p className="text-xs text-[#A8A59B] leading-relaxed">
              Every proof carries raw signed JSON payloads, Haversine distance
              claim bands (250 / 400 / 600 EUR), PNG export, X card unfurl, and
              browser signature checks.
            </p>
          </div>
        </section>

        {/* Developer MCP Banner */}
        <McpCopyBanner />
      </main>

      <footer className="border-t border-[#2B2B2B] bg-[#111111] py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#7D7B73]">
          <span>DELAY RECEIPT · POWERED BY API3 AIRNODEHUB</span>
          <span>
            CRYPTOGRAPHIC DATA EVIDENCE FOR PASSENGER CLAIMS. NOT LEGAL ADVICE.
          </span>
        </div>
      </footer>
    </div>
  );
}
