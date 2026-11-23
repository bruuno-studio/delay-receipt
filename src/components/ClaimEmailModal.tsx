"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, X } from "@/components/Icons";
import { getAirlineProfile } from "@/lib/airlines";
import { formatUtcTime } from "@/lib/rules";
import type { FlightProofRecord } from "@/lib/types";

interface ClaimEmailModalProps {
  proof: FlightProofRecord;
  proofUrl: string;
  open: boolean;
  onClose: () => void;
}

export function ClaimEmailModal({
  proof,
  proofUrl,
  open,
  onClose,
}: ClaimEmailModalProps) {
  const [passengerName, setPassengerName] = useState("[YOUR FULL NAME]");
  const [bookingRef, setBookingRef] = useState("[6-CHAR PNR]");
  const [ticketNumber, setTicketNumber] = useState("");
  const [airlineExcuse, setAirlineExcuse] = useState("");
  const [copied, setCopied] = useState(false);

  const airline = useMemo(
    () => getAirlineProfile(proof.flightNumber, proof.airlineName),
    [proof.flightNumber, proof.airlineName]
  );

  const isCancelled = proof.verdict.delayStatus === "CANCELLED";
  const claimAmount =
    proof.verdict.compensation.amount ?? proof.verdict.compensation.amountEur;
  const claimCurrency =
    proof.verdict.compensation.currency === "GBP" ? "GBP" : "EUR";

  const subject = isCancelled
    ? `Formal Cancellation Claim (${proof.verdict.compensation.regulation}): Flight ${proof.flightNumber} on ${proof.flightDate}`
    : `Formal Passenger Rights Claim (${proof.verdict.compensation.regulation}): Flight ${proof.flightNumber} on ${proof.flightDate}`;

  const emailBody = useMemo(() => {
    const primaryAttest = proof.attestations[0];
    const demandLine =
      proof.verdict.compensation.eligible && claimAmount > 0
        ? `${claimCurrency} ${claimAmount} per passenger under ${proof.verdict.compensation.regulation}`
        : `statutory passenger assistance, reimbursement, and written operational justification under ${proof.verdict.compensation.regulation}`;

    const disruptionPhrase = isCancelled
      ? "the cancellation of"
      : "the delayed operation of";

    const ticketLine = ticketNumber.trim()
      ? `\nE-Ticket Number: ${ticketNumber.trim()}`
      : "";
    const excuseLine = airlineExcuse.trim()
      ? `\nAirline's Stated Reason: ${airlineExcuse.trim()}`
      : "";
    const triggerLine = proof.verdict.weatherTriggerReason
      ? `\nThreshold Audit: ${proof.verdict.weatherTriggerReason}`
      : "";

    return `To: ${airline.name} Customer Relations (${airline.claimEmail})
Subject: ${subject}

Dear ${airline.name} Passenger Claims Team,

I am submitting a formal demand for ${demandLine} regarding ${disruptionPhrase} flight ${proof.flightNumber} (${proof.departure.iata} to ${proof.arrival.iata}) on ${proof.flightDate}.

PASSENGER & BOOKING DETAILS
Passenger Name: ${passengerName}
Booking Reference (PNR): ${bookingRef}${ticketLine}
Flight Number: ${proof.flightNumber}
Route: ${proof.departure.name} (${proof.departure.iata}) to ${proof.arrival.name} (${proof.arrival.iata})
Great-Circle Distance: ${proof.verdict.compensation.distanceKm} km${excuseLine}

CRYPTOGRAPHICALLY SIGNED FLIGHT & WEATHER EVIDENCE
Scheduled Arrival: ${formatUtcTime(proof.scheduledArrivalUtc)} (${proof.scheduledArrivalUtc})
Actual Arrival: ${isCancelled ? "CANCELLED" : `${formatUtcTime(proof.actualArrivalUtc)} (${proof.actualArrivalUtc || "N/A"})`}
Verified Outcome: ${proof.verdict.delayFormatted}${isCancelled ? "" : ` (${proof.verdict.delayMinutes} minutes)`}
Departure Airport Weather (${proof.departure.iata}): ${proof.departureWeather.conditionLabel}, wind ${proof.departureWeather.windKt} kt (gusts ${proof.departureWeather.gustKt} kt), visibility ${proof.departureWeather.visibilityKm.toFixed(1)} km, precipitation ${proof.departureWeather.precipitationMm.toFixed(1)} mm.
Arrival Airport Weather (${proof.arrival.iata}): ${proof.arrivalWeather.conditionLabel}, wind ${proof.arrivalWeather.windKt} kt (gusts ${proof.arrivalWeather.gustKt} kt), visibility ${proof.arrivalWeather.visibilityKm.toFixed(1)} km, precipitation ${proof.arrivalWeather.precipitationMm.toFixed(1)} mm.
Meteorological Finding: ${proof.verdict.stampTitle}${triggerLine}

Independent, cryptographically signed telemetry attestations from AeroDataBox and ${proof.departureWeather.provider} via API3 AirnodeHub are permanently archived and independently verifiable at:
${proofUrl}

Primary Airnode Signer: ${primaryAttest?.airnode || "N/A"}
Attestation Timestamp (UTC): ${proof.createdAtUtc}
Signature Digest: ${proof.signatureDigestShort}

Because signed meteorological observations confirm normal operating weather at both origin and destination airports within the scheduled flight window, extraordinary weather circumstances do not apply to this disruption.

Please confirm receipt of this claim and respond within 14 calendar days with settlement confirmation or substantiated operational documentation.

Sincerely,
${passengerName}`;
  }, [
    airline,
    airlineExcuse,
    bookingRef,
    claimAmount,
    claimCurrency,
    isCancelled,
    passengerName,
    proof,
    proofUrl,
    subject,
    ticketNumber,
  ]);

  if (!open) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "claim_email_copies",
        proofId: proof.id,
        meta: { flightNumber: proof.flightNumber },
      }),
    }).catch(() => {});
  }

  const mailtoHref = `mailto:${encodeURIComponent(airline.claimEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-email-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-3xl bg-[#181818] border border-[#2B2B2B] max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#2B2B2B] flex items-center justify-between gap-4">
          <div>
            <h2
              id="claim-email-title"
              className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-[#F3F1EA]"
            >
              PASSENGER RIGHTS CLAIM EMAIL ({proof.verdict.compensation.regulation})
            </h2>
            <p className="font-mono text-[11px] text-[#8E8C84] mt-0.5">
              STAYS LOCAL IN YOUR BROWSER · NEVER PUBLISHED ON YOUR PUBLIC PROOF CARD
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close claim email dialog"
            className="p-2 border border-[#2B2B2B] hover:border-[#F3F1EA] text-[#B8B5AA] hover:text-[#F3F1EA] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="claim-passenger"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#8E8C84] mb-1.5"
              >
                PASSENGER FULL NAME
              </label>
              <input
                id="claim-passenger"
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full h-10 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none px-3 font-mono text-xs text-[#F3F1EA]"
              />
            </div>
            <div>
              <label
                htmlFor="claim-pnr"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#8E8C84] mb-1.5"
              >
                BOOKING REFERENCE (PNR)
              </label>
              <input
                id="claim-pnr"
                type="text"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                className="w-full h-10 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none px-3 font-mono text-xs text-[#F3F1EA]"
              />
            </div>
            <div>
              <label
                htmlFor="claim-ticket"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#8E8C84] mb-1.5"
              >
                E-TICKET NUMBER (OPTIONAL)
              </label>
              <input
                id="claim-ticket"
                type="text"
                placeholder="e.g. 220-1234567890"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                className="w-full h-10 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none px-3 font-mono text-xs text-[#F3F1EA] placeholder:text-[#57554E]"
              />
            </div>
            <div>
              <label
                htmlFor="claim-excuse"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#8E8C84] mb-1.5"
              >
                AIRLINE&apos;S STATED EXCUSE (OPTIONAL)
              </label>
              <input
                id="claim-excuse"
                type="text"
                placeholder="e.g. Gate announced adverse weather"
                value={airlineExcuse}
                onChange={(e) => setAirlineExcuse(e.target.value)}
                className="w-full h-10 bg-[#111111] border border-[#2B2B2B] focus:border-[#F3F1EA] focus:outline-none px-3 font-mono text-xs text-[#F3F1EA] placeholder:text-[#57554E]"
              />
            </div>
          </div>

          <pre className="bg-[#111111] border border-[#2B2B2B] p-4 font-mono text-xs text-[#D6D3C9] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
            {emailBody}
          </pre>
        </div>

        <div className="px-5 py-4 border-t border-[#2B2B2B] flex flex-wrap items-center justify-between gap-3 bg-[#131313]">
          <span className="font-mono text-[11px] text-[#8E8C84]">
            RECIPIENT: {airline.claimEmail}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={mailtoHref}
              className="h-10 px-4 border border-[#2B2B2B] hover:border-[#F3F1EA] bg-[#181818] text-[#F3F1EA] font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>OPEN MAIL CLIENT</span>
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-5 bg-[#F3F1EA] hover:bg-white text-[#121212] font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>COPIED EMAIL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CLAIM EMAIL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
