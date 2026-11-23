import Link from "next/link";
import { isDemoMode } from "@/lib/airnodehub";

export function SiteHeader() {
  const demo = isDemoMode();

  return (
    <header className="border-b border-[#2B2B2B] bg-[#111111]/95 sticky top-0 z-30 backdrop-blur-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none"
        >
          <span className="w-2.5 h-2.5 bg-[#D92D20] inline-block shrink-0" />
          <span className="font-sans font-bold tracking-tight text-sm sm:text-base text-[#F3F1EA] group-hover:text-white">
            DELAY RECEIPT
          </span>
          <span className="hidden md:inline-block font-mono text-[11px] text-[#8E8C84] border-l border-[#2B2B2B] pl-3">
            CRYPTOGRAPHIC AVIATION TELEMETRY
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5 font-mono text-xs">
          <span
            className={`px-2 py-1 border text-[11px] tracking-wider uppercase ${
              demo
                ? "border-[#2B2B2B] bg-[#181818] text-[#B8B5AA]"
                : "border-[#16A34A]/60 bg-[#16A34A]/10 text-[#16A34A]"
            }`}
          >
            {demo ? "DEMO MODE · SIGNED FIXTURES" : "LIVE · AIRNODEHUB X402"}
          </span>
          <Link
            href="/"
            className="text-[#B8B5AA] hover:text-[#F3F1EA] transition-colors uppercase tracking-wider"
          >
            Lookup
          </Link>
          <Link
            href="/metrics"
            className="text-[#B8B5AA] hover:text-[#F3F1EA] transition-colors uppercase tracking-wider"
          >
            Metrics
          </Link>
        </nav>
      </div>
    </header>
  );
}
