import Link from "next/link";
import { ArrowUpRight } from "@/components/Icons";
import type { FlightProofRecord } from "@/lib/types";

interface ShameWallProps {
  proofs: FlightProofRecord[];
}

export function ShameWall({ proofs }: ShameWallProps) {
  return (
    <section
      aria-labelledby="shame-wall-heading"
      className="border border-[#2B2B2B] bg-[#181818]"
    >
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#2B2B2B] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-[#D92D20] inline-block" />
          <h2
            id="shame-wall-heading"
            className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#F3F1EA]"
          >
            TODAY&apos;S SHAME WALL · CLEAR-SKY DELAYS VERIFIED
          </h2>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8E8C84]">
          CLICK ANY ROW TO INSPECT SIGNED RECEIPT
        </span>
      </div>

      {/* Desktop Column Header */}
      <div className="hidden md:grid grid-cols-[115px_125px_1fr_140px_190px_145px_36px] gap-4 px-6 py-2.5 border-b border-[#2B2B2B] bg-[#131313] font-mono text-[11px] uppercase tracking-[0.14em] text-[#8E8C84]">
        <span>FLIGHT</span>
        <span>ROUTE</span>
        <span>AIRLINE</span>
        <span>DELAY</span>
        <span>AIRPORT SKIES</span>
        <span>STATUTORY CLAIM</span>
        <span />
      </div>

      <div className="divide-y divide-[#2B2B2B]">
        {proofs.length === 0 && (
          <div className="px-6 py-8 font-mono text-xs text-[#8E8C84] text-center">
            NO LIVE PROOFS ARCHIVED YET. SUBMIT ANY FLIGHT ABOVE TO GENERATE THE
            FIRST SIGNED AIRNODEHUB RECEIPT.
          </div>
        )}
        {proofs.map((proof) => (
          <Link
            key={proof.id}
            href={`/proof/${proof.id}`}
            className="grid grid-cols-1 md:grid-cols-[115px_125px_1fr_140px_190px_145px_36px] gap-2 md:gap-4 px-4 sm:px-6 py-4 hover:bg-[#1F1F1F] transition-colors items-center group"
          >
            <div className="flex items-center justify-between md:block">
              <span className="font-mono text-base font-bold text-[#F3F1EA] tracking-tight">
                {proof.flightNumber}
              </span>
              <span className="md:hidden font-mono text-xs font-bold text-[#D92D20]">
                {proof.verdict.delayFormatted}
              </span>
            </div>

            <div className="font-mono text-sm text-[#D6D3C9] font-semibold">
              {proof.departure.iata} -&gt; {proof.arrival.iata}
            </div>

            <div className="flex items-center gap-2 text-sm text-[#B8B5AA]">
              <span className="font-medium text-[#F3F1EA]">
                {proof.airlineName}
              </span>
              <span className="font-mono text-xs text-[#7D7B73]">
                {proof.airlineHandle}
              </span>
            </div>

            <div className="hidden md:block font-mono text-sm font-bold text-[#D92D20]">
              {proof.verdict.delayFormatted}
            </div>

            <div className="font-mono text-xs text-[#16A34A] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#16A34A] inline-block shrink-0" />
              <span>
                {proof.departureWeather.conditionLabel.toUpperCase()} ·{" "}
                {proof.departureWeather.windKt} KT
              </span>
            </div>

            <div className="font-mono text-xs font-bold">
              <span className="inline-block border border-[#D92D20]/70 bg-[#D92D20]/15 text-[#F3F1EA] px-2 py-0.5">
                {proof.verdict.compensation.eligible
                  ? `${proof.verdict.compensation.amount ?? proof.verdict.compensation.amountEur} ${proof.verdict.compensation.currency === "GBP" ? "GBP" : "EUR"} · ${proof.verdict.compensation.regulation.split(" / ")[0]}`
                  : proof.verdict.stampTitle}
              </span>
            </div>

            <div className="hidden md:flex justify-end text-[#7D7B73] group-hover:text-[#F3F1EA] transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
