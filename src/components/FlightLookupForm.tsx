"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Plane,
  Calendar,
  AlertTriangle,
} from "@/components/Icons";

const QUICK_FLIGHTS = [
  { code: "LH400", label: "LH400 · FRA -> JFK" },
  { code: "FR1234", label: "FR1234 · STN -> BCN" },
  { code: "TK1952", label: "TK1952 · AMS -> IST" },
  { code: "BA456", label: "BA456 · LHR -> MAD" },
  { code: "UA901", label: "UA901 · SFO -> LHR" },
];

interface FlightLookupFormProps {
  defaultDate: string;
  todayDate: string;
  yesterdayDate: string;
  isDemo: boolean;
}

export function FlightLookupForm({
  defaultDate,
  todayDate,
  yesterdayDate,
  isDemo,
}: FlightLookupFormProps) {
  const router = useRouter();
  const [flightNumber, setFlightNumber] = useState(isDemo ? "LH400" : "");
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = flightNumber.trim().toUpperCase();
    if (!cleaned) {
      setError(
        "Enter a flight number such as LH400, FR1234, BA456, or TK1952."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/check-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightNumber: cleaned, date }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        proof?: { id: string };
        error?: string;
      };

      if (!res.ok || !payload.proof) {
        setError(payload.error || "Unable to verify flight telemetry.");
        setLoading(false);
        return;
      }

      router.push(`/proof/${payload.proof.id}`);
    } catch {
      setError("Network error while contacting telemetry service.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#2B2B2B] bg-[#181818] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-[#2B2B2B]">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#B8B5AA]">
          FLIGHT TELEMETRY QUERY
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8E8C84]">
          RETROACTIVE EU261 / UK261 DATES SUPPORTED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-4 items-end">
        <div>
          <label
            htmlFor="flight-number"
            className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#A8A59B] mb-2"
          >
            FLIGHT NUMBER
          </label>
          <div className="relative">
            <Plane className="w-4 h-4 text-[#7D7B73] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="flight-number"
              name="flightNumber"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="LH400, FR1234, BA456, TK1952"
              className="w-full h-12 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none pl-10 pr-4 font-mono text-base font-bold text-[#F3F1EA] placeholder:text-[#57554E] tracking-wider uppercase"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="flight-date"
              className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#A8A59B]"
            >
              FLIGHT DATE (LOCAL)
            </label>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setDate(yesterdayDate)}
                className={`px-1.5 py-0.5 border cursor-pointer ${
                  date === yesterdayDate
                    ? "border-[#F3F1EA] text-[#F3F1EA]"
                    : "border-[#2B2B2B] text-[#8E8C84] hover:text-[#F3F1EA]"
                }`}
              >
                YESTERDAY
              </button>
              <button
                type="button"
                onClick={() => setDate(todayDate)}
                className={`px-1.5 py-0.5 border cursor-pointer ${
                  date === todayDate
                    ? "border-[#F3F1EA] text-[#F3F1EA]"
                    : "border-[#2B2B2B] text-[#8E8C84] hover:text-[#F3F1EA]"
                }`}
              >
                TODAY
              </button>
            </div>
          </div>
          <div className="relative">
            <Calendar className="w-4 h-4 text-[#7D7B73] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="flight-date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none pl-10 pr-4 font-mono text-sm font-semibold text-[#F3F1EA]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-12 px-7 bg-[#D92D20] hover:bg-[#B91C1C] disabled:opacity-60 text-[#F3F1EA] font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.16em] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SIGNING PROOF</span>
            </>
          ) : (
            <>
              <span>GENERATE PROOF</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Quick Presets in DEMO mode; clean format note in LIVE mode */}
      {isDemo ? (
        <div className="mt-4 pt-4 border-t border-[#2B2B2B] flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#7D7B73] mr-1">
            DEMO PRESETS:
          </span>
          {QUICK_FLIGHTS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setFlightNumber(item.code);
                setError(null);
              }}
              className={`font-mono text-[11px] px-2.5 py-1 border transition-colors cursor-pointer ${
                flightNumber === item.code
                  ? "border-[#F3F1EA] bg-[#F3F1EA] text-[#121212] font-bold"
                  : "border-[#2B2B2B] bg-[#111111] text-[#B8B5AA] hover:border-[#57554E] hover:text-[#F3F1EA]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-[#2B2B2B] font-mono text-[11px] text-[#8E8C84] flex flex-wrap items-center justify-between gap-2">
          <span>
            FORMAT: IATA CODE + NUMBER (E.G. LH400, FR1234, BA456, TK1952).
            DUPLICATE LOOKUPS ARE SERVED FROM CACHE.
          </span>
          <span>OR INSPECT A VERIFIED RECEIPT BELOW</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 border border-[#D92D20] bg-[#D92D20]/10 px-4 py-3 font-mono text-xs text-[#FCA5A5] flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-[#D92D20] shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
