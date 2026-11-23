"use client";

import { useEffect, useState } from "react";
import { Check, Download, Link2, Mail, Share2 } from "@/components/Icons";
import { downloadBoardingPassPngClient } from "@/lib/exportPng";
import { ClaimEmailModal } from "./ClaimEmailModal";
import type { FlightProofRecord } from "@/lib/types";

interface ProofActionsBarProps {
  proof: FlightProofRecord;
  baseUrl: string;
}

export function ProofActionsBar({ proof, baseUrl }: ProofActionsBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const proofUrl = `${baseUrl.replace(/\/$/, "")}/proof/${proof.id}`;

  // Record proof view once per mount
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "proof_views",
        proofId: proof.id,
        meta: { flightNumber: proof.flightNumber },
      }),
    }).catch(() => {});
  }, [proof.id, proof.flightNumber]);

  const tweetText = (() => {
    const weatherBrief = `${proof.departure.iata}: ${proof.departureWeather.conditionLabel.toLowerCase()}, ${proof.departureWeather.windKt}kt winds, ${proof.departureWeather.visibilityKm.toFixed(1)}km vis`;
    const isDisrupted =
      proof.verdict.delayStatus === "DELAYED" ||
      proof.verdict.delayStatus === "CANCELLED";

    if (proof.verdict.weatherVerdict === "NOT_WEATHER" && isDisrupted) {
      const claimAmt =
        proof.verdict.compensation.amount ?? proof.verdict.compensation.amountEur;
      const claimCurr =
        proof.verdict.compensation.currency === "GBP" ? "GBP" : "EUR";
      const claimLine =
        proof.verdict.compensation.eligible && claimAmt > 0
          ? ` ${claimAmt} ${claimCurr} ${proof.verdict.compensation.regulation.split(" / ")[0]} claim on the record.`
          : "";
      const eventPhrase =
        proof.verdict.delayStatus === "CANCELLED"
          ? "was CANCELLED"
          : `was ${proof.verdict.delayFormatted}`;
      return `Hey ${proof.airlineHandle}, flight ${proof.flightNumber} (${proof.departure.iata}->${proof.arrival.iata}) ${eventPhrase}. Cryptographically signed AirnodeHub telemetry confirms clear skies (${weatherBrief}). Not weather.${claimLine}`;
    }
    return `Flight ${proof.flightNumber} (${proof.departure.iata}->${proof.arrival.iata}) verified via AirnodeHub signed telemetry: ${proof.verdict.delayFormatted} (${proof.verdict.stampTitle}).`;
  })();

  const xIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(proofUrl)}`;

  function trackEvent(type: "x_share_clicks" | "png_downloads") {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        proofId: proof.id,
        meta: { flightNumber: proof.flightNumber, airline: proof.airlineHandle },
      }),
    }).catch(() => {});
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(proofUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDownloadPng() {
    if (downloadingPng) return;
    setDownloadingPng(true);
    trackEvent("png_downloads");
    try {
      await downloadBoardingPassPngClient(proof);
    } catch {
      // Fallback to server PNG route if canvas export is unavailable
      window.location.href = `/api/og/${proof.id}?hd=1&download=1`;
    } finally {
      setDownloadingPng(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <a
          href={xIntentUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent("x_share_clicks")}
          className="h-12 px-5 bg-[#D92D20] hover:bg-[#B91C1C] text-[#F3F1EA] font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-colors"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>EXPOSE ON X ({proof.airlineHandle})</span>
        </a>

        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloadingPng}
          className="h-12 px-5 border border-[#F3F1EA] bg-[#F3F1EA] hover:bg-white disabled:opacity-60 text-[#121212] font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{downloadingPng ? "RENDERING PNG..." : "DOWNLOAD PNG"}</span>
        </button>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-12 px-5 border border-[#2B2B2B] hover:border-[#F3F1EA] bg-[#181818] text-[#F3F1EA] font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <Mail className="w-4 h-4 shrink-0" />
          <span>COPY CLAIM EMAIL</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="h-12 px-5 border border-[#2B2B2B] hover:border-[#F3F1EA] bg-[#181818] text-[#B8B5AA] hover:text-[#F3F1EA] font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span className="text-[#16A34A]">PROOF LINK COPIED</span>
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 shrink-0" />
              <span>COPY PROOF LINK</span>
            </>
          )}
        </button>
      </div>

      <ClaimEmailModal
        proof={proof}
        proofUrl={proofUrl}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
