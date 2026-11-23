import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/Icons";
import { AirportAnnouncement } from "@/components/AirportAnnouncement";
import { BoardingPassCard } from "@/components/BoardingPassCard";
import { McpCopyBanner } from "@/components/McpCopyBanner";
import { ProofActionsBar } from "@/components/ProofActionsBar";
import { SignatureDrawer } from "@/components/SignatureDrawer";
import { SiteHeader } from "@/components/SiteHeader";
import { getProofById } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface ProofPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProofPageProps): Promise<Metadata> {
  const { id } = await params;
  const proof = await getProofById(id);

  if (!proof) {
    return {
      title: "Proof Not Found",
    };
  }

  const title = `${proof.flightNumber} (${proof.departure.iata} -> ${proof.arrival.iata}) ${proof.verdict.delayFormatted} · ${proof.verdict.stampTitle}`;
  const description = `Cryptographically signed AirnodeHub delay receipt for ${proof.airlineName} ${proof.flightNumber} on ${proof.flightDate}. ${proof.verdict.weatherSummary}. ${proof.verdict.compensation.badgeText}.`;
  const ogUrl = `/api/og/${proof.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `Signed Delay Receipt for ${proof.flightNumber}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { id } = await params;
  const proof = await getProofById(id);

  if (!proof) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen flex flex-col bg-[#111111] bg-grid-pattern">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#B8B5AA] hover:text-[#F3F1EA] uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>CHECK ANOTHER FLIGHT</span>
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-[#8E8C84]">
            <span>MODE: {proof.mode}</span>
            <span>·</span>
            <span>API COST: ${proof.totalApiCostUsd.toFixed(2)} aUSD</span>
          </div>
        </div>

        {/* Module 1: Signed Boarding Pass Card */}
        <BoardingPassCard proof={proof} />

        {/* Module 2: Share & Action Bar */}
        <ProofActionsBar proof={proof} baseUrl={baseUrl} />

        {/* Module 3: Voice Agent PA Announcement */}
        <AirportAnnouncement
          proofId={proof.id}
          flightNumber={proof.flightNumber}
          script={proof.verdict.paScript}
        />

        {/* Module 4: Cryptographic Verification Drawer */}
        <SignatureDrawer
          proofId={proof.id}
          attestations={proof.attestations}
        />

        {/* Module 5: Developer MCP Hook Banner */}
        <McpCopyBanner proofId={proof.id} />
      </main>

      <footer className="border-t border-[#2B2B2B] bg-[#111111] py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#7D7B73]">
          <span>PERMANENT PROOF URL: /proof/{proof.id}</span>
          <span>{proof.verdict.disclaimer}</span>
        </div>
      </footer>
    </div>
  );
}
