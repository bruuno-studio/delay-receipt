import Link from "next/link";
import { ArrowUpRight, Lock } from "@/components/Icons";
import { SiteHeader } from "@/components/SiteHeader";
import { getServerSecret } from "@/lib/cfEnv";
import { getMetricsSnapshot } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface MetricsPageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const gateKey = await getServerSecret("METRICS_ACCESS_KEY");
  const resolvedParams = await searchParams;

  if (gateKey && resolvedParams.key !== gateKey) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111111]">
        <SiteHeader />
        <main className="flex-1 max-w-xl w-full mx-auto px-6 py-24 flex flex-col items-center justify-center text-center">
          <div className="border border-[#2B2B2B] bg-[#181818] p-8 w-full space-y-4">
            <Lock className="w-8 h-8 text-[#D92D20] mx-auto" />
            <h1 className="font-mono text-base font-bold uppercase tracking-widest text-[#F3F1EA]">
              METRICS ACCESS KEY REQUIRED
            </h1>
            <p className="font-mono text-xs text-[#8E8C84]">
              Append ?key=YOUR_KEY to view live funnel telemetry.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const metrics = await getMetricsSnapshot();
  const maxDailyTotal = Math.max(
    1,
    ...metrics.dailyActivity.map(
      (d) => d.cards + d.views + d.shares + d.verifications
    )
  );

  const primaryKpis = [
    {
      label: "CARDS GENERATED",
      value: metrics.totals.cardsGenerated.toLocaleString("en-US"),
      sub: "Signed flight proof receipts",
      accent: "text-[#F3F1EA]",
    },
    {
      label: "AIRNODEHUB CALLS",
      value: metrics.totals.airnodehubCalls.toLocaleString("en-US"),
      sub: `Est. $${metrics.totals.estimatedSpendUsd.toFixed(2)} aUSD spend`,
      accent: "text-[#F3F1EA]",
    },
    {
      label: "X SHARE CONVERSION",
      value: `${metrics.totals.xShareConversionPct.toFixed(1)}%`,
      sub: `${metrics.totals.xShareClicks} share clicks / ${metrics.totals.cardsGenerated} cards`,
      accent: "text-[#D92D20]",
    },
    {
      label: "PROOF PAGE VIEWS",
      value: metrics.totals.proofViews.toLocaleString("en-US"),
      sub: `${metrics.totals.pngDownloads} PNG downloads · ${metrics.totals.claimEmailCopies} email copies`,
      accent: "text-[#F3F1EA]",
    },
    {
      label: "SIGNATURE CHECKS",
      value: metrics.totals.signatureChecks.toLocaleString("en-US"),
      sub: "Client-side EIP-191 verifications",
      accent: "text-[#16A34A]",
    },
    {
      label: "MCP CONFIG COPIES",
      value: metrics.totals.mcpConfigCopies.toLocaleString("en-US"),
      sub: `${metrics.totals.voicePlays} PA voice verdicts played`,
      accent: "text-[#16A34A]",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#111111] bg-grid-pattern">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Title Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2B2B2B] pb-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#16A34A]">
              LIVE PRODUCT & VIRAL FUNNEL TELEMETRY
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-[#F3F1EA] mt-1">
              GROWTH & ATTESTATION METRICS
            </h1>
          </div>
          <Link
            href="/"
            className="px-4 py-2 border border-[#2B2B2B] hover:border-[#F3F1EA] bg-[#181818] font-mono text-xs font-bold uppercase tracking-wider text-[#F3F1EA]"
          >
            NEW FLIGHT CHECK
          </Link>
        </div>

        {/* 6-Card KPI Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-[#2B2B2B] bg-[#181818] divide-y sm:divide-y-0">
          {primaryKpis.map((kpi) => (
            <div
              key={kpi.label}
              className="p-5 border-b border-r border-[#2B2B2B] flex flex-col justify-between gap-3"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8E8C84]">
                {kpi.label}
              </div>
              <div className={`font-mono text-3xl sm:text-4xl font-bold ${kpi.accent}`}>
                {kpi.value}
              </div>
              <div className="font-mono text-[11px] text-[#A8A59B]">
                {kpi.sub}
              </div>
            </div>
          ))}
        </section>

        {/* Daily Activity Bar Chart */}
        <section className="border border-[#2B2B2B] bg-[#181818] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#F3F1EA]">
                DAILY FUNNEL ACTIVITY
              </h2>
              <p className="font-mono text-[11px] text-[#8E8C84] mt-0.5">
                CARDS GENERATED · VIEWS · X SHARES · SIGNATURE CHECKS
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-[#A8A59B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#F3F1EA] inline-block" />
                CARDS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#D92D20] inline-block" />
                X SHARES
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#16A34A] inline-block" />
                VERIFY
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#57554E] inline-block" />
                VIEWS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 sm:gap-3 items-end h-44 pt-4 border-b border-[#2B2B2B] pb-2">
            {metrics.dailyActivity.map((day) => {
              const total =
                day.cards + day.shares + day.verifications + day.views;
              const pct = Math.max(
                total > 0 ? 12 : 3,
                Math.round((total / maxDailyTotal) * 100)
              );

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center justify-end h-full gap-2"
                >
                  <span className="font-mono text-[10px] text-[#8E8C84]">
                    {total}
                  </span>
                  <div
                    style={{ height: `${pct}%` }}
                    className="w-full max-w-[40px] flex flex-col-reverse bg-[#232323] border border-[#2B2B2B] overflow-hidden"
                    title={`${day.date}: ${day.cards} cards, ${day.views} views, ${day.shares} shares, ${day.verifications} checks`}
                  >
                    {day.cards > 0 && (
                      <div
                        style={{ flexGrow: day.cards }}
                        className="bg-[#F3F1EA] min-h-[4px]"
                      />
                    )}
                    {day.shares > 0 && (
                      <div
                        style={{ flexGrow: day.shares }}
                        className="bg-[#D92D20] min-h-[4px]"
                      />
                    )}
                    {day.verifications > 0 && (
                      <div
                        style={{ flexGrow: day.verifications }}
                        className="bg-[#16A34A] min-h-[4px]"
                      />
                    )}
                    {day.views > 0 && (
                      <div
                        style={{ flexGrow: day.views }}
                        className="bg-[#57554E] min-h-[4px]"
                      />
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#7D7B73]">
                    {day.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Table of Last 20 Generated Proofs */}
        <section className="border border-[#2B2B2B] bg-[#181818] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#2B2B2B] flex items-center justify-between">
            <h2 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#F3F1EA]">
              LAST 20 SIGNED PROOFS
            </h2>
            <span className="font-mono text-[11px] text-[#8E8C84]">
              SHOWING {metrics.recentProofs.length} RECORDS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[#131313] border-b border-[#2B2B2B] text-[10px] uppercase tracking-[0.14em] text-[#8E8C84]">
                  <th className="py-3 px-4">FLIGHT</th>
                  <th className="py-3 px-4">ROUTE</th>
                  <th className="py-3 px-4">DELAY</th>
                  <th className="py-3 px-4">VERDICT</th>
                  <th className="py-3 px-4">CLAIM</th>
                  <th className="py-3 px-4">MODE</th>
                  <th className="py-3 px-4">COST</th>
                  <th className="py-3 px-4 text-right">LINK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B2B2B]">
                {metrics.recentProofs.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#1F1F1F] transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-[#F3F1EA] whitespace-nowrap">
                      {row.flightNumber}
                      <span className="block text-[10px] font-normal text-[#8E8C84]">
                        {row.flightDate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#D6D3C9] whitespace-nowrap">
                      {row.route}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#D92D20] whitespace-nowrap">
                      {row.delayFormatted}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold border ${
                          row.weatherVerdict === "NOT_WEATHER"
                            ? "border-[#D92D20]/60 bg-[#D92D20]/10 text-[#FCA5A5]"
                            : "border-[#D97706]/60 bg-[#D97706]/10 text-[#FCD34D]"
                        }`}
                      >
                        {row.stampTitle}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#B8B5AA] whitespace-nowrap">
                      {row.claimBadge}
                    </td>
                    <td className="py-3 px-4 text-[#8E8C84]">{row.mode}</td>
                    <td className="py-3 px-4 text-[#A8A59B]">
                      ${row.costUsd.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/proof/${row.id}`}
                        className="inline-flex items-center gap-1 text-[#F3F1EA] hover:text-[#D92D20]"
                      >
                        <span>VIEW</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
