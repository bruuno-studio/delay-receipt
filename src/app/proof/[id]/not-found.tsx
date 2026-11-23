import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function ProofNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#111111] bg-grid-pattern">
      <SiteHeader />
      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-24 flex flex-col items-center justify-center text-center">
        <div className="border border-[#2B2B2B] bg-[#181818] p-8 w-full space-y-4">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#D92D20]">
            404 · RECORD NOT FOUND
          </div>
          <h1 className="font-sans text-2xl font-bold text-[#F3F1EA]">
            SIGNED PROOF RECEIPT NOT FOUND
          </h1>
          <p className="font-mono text-xs text-[#8E8C84] leading-relaxed">
            No archived flight attestation matches this ID. Run a new flight
            lookup to generate a fresh cryptographically signed boarding pass.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#D92D20] hover:bg-[#B91C1C] text-[#F3F1EA] font-mono text-xs font-bold uppercase tracking-wider"
            >
              RETURN TO FLIGHT LOOKUP
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
