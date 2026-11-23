"use client";

import { useMemo } from "react";
import { ShieldCheck } from "@/components/Icons";
import { formatUtcTime, generateDeterministicBarcode } from "@/lib/rules";
import type { FlightProofRecord } from "@/lib/types";

interface BoardingPassCardProps {
  proof: FlightProofRecord;
}

export function BoardingPassCard({ proof }: BoardingPassCardProps) {
  const primaryAttestation = proof.attestations[0];

  const barcodeBars = useMemo(
    () =>
      generateDeterministicBarcode(
        primaryAttestation?.signature || proof.id,
        48
      ),
    [primaryAttestation?.signature, proof.id]
  );

  const stampStyles =
    proof.verdict.stampTone === "red"
      ? "border-[#D92D20] text-[#D92D20]"
      : proof.verdict.stampTone === "green"
        ? "border-[#16A34A] text-[#16A34A]"
        : "border-[#D97706] text-[#D97706]";

  return (
    <article
      aria-label={`Signed delay receipt for flight ${proof.flightNumber}`}
      className="relative paper-grain text-[#121212] border border-[#2B2B2B] shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Top Archival Perforated Header Strip */}
      <div className="bg-[#121212] text-[#F3F1EA] px-5 sm:px-7 py-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#D92D20] inline-block" />
          SIGNED BOARDING PASS · FLIGHT DELAY PROOF RECEIPT
        </span>
        <span className="text-[#A8A59B]">
          RECORD #{proof.id.toUpperCase()} · {proof.mode}
        </span>
      </div>

      {/* Main Pass + Perforated Stub Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px] relative">
        {/* Semicircular Perforation Notches on Desktop */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-0 right-[270px] translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#111111] border border-[#2B2B2B] z-10"
        />
        <div
          aria-hidden="true"
          className="hidden lg:block absolute bottom-0 right-[270px] translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-[#111111] border border-[#2B2B2B] z-10"
        />

        {/* LEFT MAIN TICKET BODY */}
        <div className="p-5 sm:p-7 border-b-2 lg:border-b-0 lg:border-r-2 border-dashed border-[#A8A498] flex flex-col justify-between gap-6">
          {/* Row 1: Carrier + Flight + Date */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#121212]/20 pb-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#57554E]">
                OPERATING CARRIER · {proof.airlineHandle}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#121212]">
                  {proof.flightNumber}
                </h1>
                <span className="font-sans text-lg sm:text-xl font-semibold text-[#2E2D29] uppercase tracking-tight">
                  {proof.airlineName}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#57554E]">
                FLIGHT DATE · AIRCRAFT
              </div>
              <div className="mt-1 text-base font-bold text-[#121212]">
                {proof.flightDate}
              </div>
              <div className="text-xs text-[#57554E]">{proof.aircraftModel}</div>
            </div>
          </div>

          {/* Row 2: Route + Tilted Rubber Ink Stamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#57554E]">
                ROUTE · GREAT-CIRCLE {proof.verdict.compensation.distanceKm.toLocaleString("en-US")} KM
              </div>
              <div className="mt-1 flex items-center gap-3 sm:gap-4 font-mono">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                  {proof.departure.iata}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#57554E]">
                  -&gt;
                </span>
                <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                  {proof.arrival.iata}
                </span>
              </div>
              <div className="mt-1 font-mono text-xs text-[#57554E] uppercase">
                {proof.departure.municipality} ({proof.departure.icao}) TO{" "}
                {proof.arrival.municipality} ({proof.arrival.icao})
              </div>
            </div>

            {/* Tilted Ink Verdict Stamp */}
            <div className="self-start sm:self-center">
              <div
                className={`ink-stamp ${stampStyles} px-4 py-2.5 -rotate-3 sm:-rotate-4 bg-[#F3F1EA]/90 select-none`}
              >
                <div className="font-mono text-sm sm:text-base font-bold uppercase leading-tight whitespace-nowrap">
                  {proof.verdict.stampTitle}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] mt-1 opacity-90">
                  {proof.verdict.stampSubtitle}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Oversized Delay Counter + Scheduled vs Actual */}
          <div className="bg-[#121212] text-[#F3F1EA] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A8A59B]">
                {proof.verdict.delayBasis === "CANCELLED"
                  ? "VERIFIED FLIGHT CANCELLATION"
                  : proof.verdict.delayBasis === "DEPARTURE_DELAY"
                    ? "DEPARTURE DELAY (ARRIVAL DATA UNAVAILABLE)"
                    : "VERIFIED ARRIVAL DELAY"}
              </div>
              <div
                className={`mt-1 font-sans text-3xl sm:text-5xl font-bold tracking-tight leading-none ${
                  proof.verdict.delayStatus === "ON_TIME"
                    ? "text-[#16A34A]"
                    : proof.verdict.delayStatus === "CANCELLED"
                      ? "text-[#D92D20]"
                      : "text-[#F3F1EA]"
                }`}
              >
                {proof.verdict.delayFormatted}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs border-t md:border-t-0 md:border-l border-[#2B2B2B] pt-3 md:pt-0 md:pl-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#8E8C84]">
                  SCHED DEP
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {formatUtcTime(proof.scheduledDepartureUtc)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#8E8C84] mt-2">
                  ACTUAL DEP
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {formatUtcTime(proof.actualDepartureUtc)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#8E8C84]">
                  SCHED ARR
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {formatUtcTime(proof.scheduledArrivalUtc)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#8E8C84] mt-2">
                  ACTUAL ARR
                </div>
                <div className="mt-0.5 text-sm font-bold text-[#D92D20]">
                  {formatUtcTime(proof.actualArrivalUtc)}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Departure & Arrival Airport Weather Snapshots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            {[
              { label: "DEPARTURE METEOROLOGY", snap: proof.departureWeather },
              { label: "ARRIVAL METEOROLOGY", snap: proof.arrivalWeather },
            ].map(({ label, snap }) => (
              <div
                key={label}
                className="border border-[#121212]/25 bg-[#ECE9DF]/65 p-3.5"
              >
                <div className="flex items-center justify-between text-[10px] tracking-[0.14em] text-[#57554E] uppercase">
                  <span>
                    {label} · {snap.airportIata}
                  </span>
                  <span>{snap.provider}</span>
                </div>
                <div className="mt-1.5 text-sm font-bold uppercase text-[#121212]">
                  {snap.conditionLabel} ({snap.temperatureC}°C)
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 pt-2 border-t border-[#121212]/15 text-xs">
                  <div>
                    <div className="text-[10px] text-[#57554E]">WIND</div>
                    <div className="font-bold">
                      {snap.windKt} KT
                      <span className="text-[10px] font-normal text-[#57554E] block">
                        GUST {snap.gustKt} KT
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#57554E]">VISIBILITY</div>
                    <div className="font-bold">
                      {snap.visibilityKm.toFixed(1)} KM
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#57554E]">PRECIP</div>
                    <div className="font-bold">
                      {snap.precipitationMm.toFixed(1)} MM
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-[#57554E]">
                  WINDOW: {snap.observedWindowUtc}
                </div>
              </div>
            ))}
          </div>

          {/* Transparent Rule Evaluation Trigger Strip */}
          {proof.verdict.weatherTriggerReason && (
            <div
              className={`px-3.5 py-2 border font-mono text-[11px] uppercase tracking-wider ${
                proof.verdict.weatherVerdict === "NOT_WEATHER"
                  ? "border-[#16A34A]/40 bg-[#16A34A]/10 text-[#14532D]"
                  : "border-[#D97706]/50 bg-[#D97706]/10 text-[#78350F]"
              }`}
            >
              {proof.verdict.weatherTriggerReason}
            </div>
          )}

          {/* Row 5: Statutory Compensation Estimate & Disclaimer */}
          <div className="border-t border-[#121212]/25 pt-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`font-mono text-xs sm:text-sm font-bold uppercase px-2.5 py-1 border ${
                    proof.verdict.compensation.eligible
                      ? "bg-[#D92D20] text-[#F3F1EA] border-[#D92D20]"
                      : "bg-[#121212]/10 text-[#121212] border-[#121212]/30"
                  }`}
                >
                  {proof.verdict.compensation.badgeText}
                </span>
              </div>
              <span className="font-mono text-xs text-[#57554E]">
                {proof.verdict.compensation.reason}
              </span>
            </div>
            <p className="font-mono text-[11px] text-[#57554E]">
              {proof.verdict.disclaimer}
            </p>
          </div>
        </div>

        {/* RIGHT PERFORATED CRYPTOGRAPHIC STUB */}
        <aside className="p-5 sm:p-6 bg-[#ECE9DF]/80 flex flex-col justify-between gap-6 font-mono">
          <div className="space-y-4">
            {/* AirnodeHub Cryptographic Seal */}
            <div className="border-2 border-[#16A34A] bg-[#16A34A]/10 px-3 py-2.5 text-[#16A34A]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>SIGNED VIA AIRNODEHUB</span>
              </div>
              <div className="text-[10px] mt-1 text-[#14532D] uppercase tracking-wider">
                EIP-191 ATTESTATION · {proof.attestations.length} SOURCES
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E]">
                  PROOF PERMALINK ID
                </div>
                <div className="font-bold text-[#121212] mt-0.5 break-all">
                  {proof.id.toUpperCase()}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E]">
                  PRIMARY AIRNODE ADDRESS
                </div>
                <div className="font-semibold text-[#121212] mt-0.5 text-[11px] break-all">
                  {primaryAttestation?.airnode || "N/A"}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E]">
                  SIGNATURE DIGEST
                </div>
                <div className="font-semibold text-[#121212] mt-0.5 text-[11px]">
                  {proof.signatureDigestShort}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E]">
                  SIGNED UTC TIMESTAMP
                </div>
                <div className="font-semibold text-[#121212] mt-0.5 text-[11px]">
                  {proof.createdAtUtc.replace("T", " ").slice(0, 19)} UTC
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E]">
                  GATE / TERMINAL
                </div>
                <div className="font-semibold text-[#121212] mt-0.5 text-[11px]">
                  DEP T{proof.departure.terminal || "N/A"} G
                  {proof.departure.gate || "N/A"} · ARR T
                  {proof.arrival.terminal || "N/A"} G
                  {proof.arrival.gate || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Deterministic Signature Hash Barcode */}
          <div className="pt-4 border-t border-[#121212]/20">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#57554E] mb-2">
              SIGNATURE HASH BARCODE
            </div>
            <div
              className="w-full h-16 flex items-stretch overflow-hidden bg-[#F3F1EA] border border-[#121212]/20 px-1.5 py-1.5"
              aria-hidden="true"
            >
              {barcodeBars.map((bar, i) => (
                <div
                  key={i}
                  style={{ flexGrow: bar.width }}
                  className={bar.filled ? "bg-[#121212]" : "bg-transparent"}
                />
              ))}
            </div>
            <div className="mt-1.5 text-[10px] text-[#57554E] tracking-widest flex justify-between">
              <span>{proof.flightNumber}</span>
              <span>{proof.departure.iata}/{proof.arrival.iata}</span>
              <span>
                {proof.verdict.compensation.eligible
                  ? `${proof.verdict.compensation.amount ?? proof.verdict.compensation.amountEur} ${proof.verdict.compensation.currency === "GBP" ? "GBP" : "EUR"}`
                  : "EVIDENCE"}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
