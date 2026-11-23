"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "@/components/Icons";
import {
  verifyAirnodeAttestation,
  type AttestationVerificationResult,
} from "@/lib/crypto";
import type { AirnodeAttestationRecord } from "@/lib/types";

interface SignatureDrawerProps {
  proofId: string;
  attestations: AirnodeAttestationRecord[];
}

export function SignatureDrawer({
  proofId,
  attestations,
}: SignatureDrawerProps) {
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState<
    Record<string, AttestationVerificationResult>
  >({});
  const [expandedPayload, setExpandedPayload] = useState<string | null>(
    attestations[0]?.id ?? null
  );

  const verifiedCount = Object.values(results).filter((r) => r.valid).length;
  const allVerified =
    attestations.length > 0 && verifiedCount === attestations.length;
  const hasAttempted = Object.keys(results).length > 0;

  async function handleVerifyAll() {
    setVerifying(true);
    setOpen(true);

    // Log signature verification funnel event
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "signature_checks",
        proofId,
        meta: { attestationCount: attestations.length },
      }),
    }).catch(() => {});

    const entries = await Promise.all(
      attestations.map(async (att) => {
        const res = await verifyAirnodeAttestation(att);
        return [att.id, res] as const;
      })
    );

    setResults(Object.fromEntries(entries));
    setVerifying(false);
  }

  function formatPrettyJson(raw: string): string {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return (
    <section
      aria-label="Cryptographic Verification Drawer"
      className="border border-[#2B2B2B] bg-[#181818]"
    >
      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 text-left cursor-pointer group"
        >
          <Terminal className="w-4 h-4 text-[#B8B5AA]" />
          <div>
            <div className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#F3F1EA] flex items-center gap-2">
              <span>CRYPTOGRAPHIC VERIFICATION DRAWER</span>
              {open ? (
                <ChevronUp className="w-4 h-4 text-[#8E8C84]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#8E8C84]" />
              )}
            </div>
            <div className="font-mono text-[11px] text-[#8E8C84] mt-0.5">
              RAW AERODATABOX + WEATHER PAYLOADS · UTC TIMESTAMPS · EIP-191 SIGNATURES
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {allVerified && (
            <span className="inline-flex items-center gap-1.5 border border-[#16A34A] bg-[#16A34A]/15 text-[#16A34A] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              VERIFIED ({verifiedCount}/{attestations.length})
            </span>
          )}

          {hasAttempted && !allVerified && !verifying && (
            <span className="inline-flex items-center gap-1.5 border border-[#D92D20] bg-[#D92D20]/15 text-[#D92D20] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              VERIFICATION MISMATCH
            </span>
          )}

          <button
            type="button"
            onClick={handleVerifyAll}
            disabled={verifying}
            className="px-4 py-2 border border-[#16A34A] bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-[#111111] font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center gap-2 transition-colors cursor-pointer"
          >
            {verifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>VERIFYING...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VERIFY SIGNATURE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#2B2B2B] divide-y divide-[#2B2B2B]">
          {/* Algorithm Explainer Strip */}
          <div className="px-4 sm:px-6 py-3 bg-[#131313] font-mono text-[11px] text-[#A8A59B] flex flex-wrap items-center justify-between gap-2">
            <span>
              CLIENT-SIDE CHECK: keccak256(encodePacked(requestHash, uint256(timestamp), bytes(data))) + EIP-191 ecrecover
            </span>
            <a
              href="https://airnodehub-docs.api3.org/airnode/attestation"
              target="_blank"
              rel="noreferrer"
              className="text-[#F3F1EA] hover:underline inline-flex items-center gap-1"
            >
              <span>AIRNODEHUB SPEC</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {attestations.map((att) => {
            const check = results[att.id];
            const isExpanded = expandedPayload === att.id;
            const roleLabel =
              att.role === "flight_status"
                ? "FLIGHT TELEMETRY"
                : att.role === "departure_weather"
                  ? "DEPARTURE WEATHER"
                  : "ARRIVAL WEATHER";

            return (
              <div key={att.id} className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 font-mono">
                    <span className="px-2 py-0.5 border border-[#2B2B2B] bg-[#111111] text-[11px] font-bold text-[#F3F1EA]">
                      {roleLabel}
                    </span>
                    <span className="text-xs font-bold text-[#F3F1EA]">
                      {att.providerName}
                    </span>
                    <span className="text-xs text-[#8E8C84]">
                      op: {att.operation}
                    </span>
                    <span className="text-[11px] text-[#8E8C84]">
                      {att.isDemoSigner
                        ? "DEMO SIGNER (EIP-191)"
                        : `$${att.priceUsd.toFixed(2)} aUSD`}
                    </span>
                  </div>

                  {check && (
                    <span
                      className={`font-mono text-xs font-bold uppercase px-2.5 py-1 border ${
                        check.valid
                          ? "border-[#16A34A] bg-[#16A34A]/15 text-[#16A34A]"
                          : "border-[#D92D20] bg-[#D92D20]/15 text-[#D92D20]"
                      }`}
                    >
                      {check.valid ? "VERIFIED · PAYLOAD INTACT" : "FAILED"}
                    </span>
                  )}
                </div>

                {/* Cryptographic Fields Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs bg-[#111111] border border-[#2B2B2B] p-3.5">
                  <div>
                    <div className="text-[10px] text-[#7D7B73] uppercase">
                      PROVIDER LISTING URL
                    </div>
                    <div className="text-[#D6D3C9] break-all mt-0.5">
                      {att.listingUrl}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7D7B73] uppercase">
                      ATTESTATION TIMESTAMP (UTC)
                    </div>
                    <div className="text-[#D6D3C9] mt-0.5">
                      {new Date(Number(att.timestamp) * 1000).toISOString()} (unix:{" "}
                      {att.timestamp})
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7D7B73] uppercase">
                      AIRNODE SIGNER ADDRESS
                    </div>
                    <div className="text-[#F3F1EA] break-all mt-0.5">
                      {att.airnode}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7D7B73] uppercase">
                      CANONICAL REQUEST HASH
                    </div>
                    <div className="text-[#D6D3C9] break-all mt-0.5">
                      {att.requestHash}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[10px] text-[#7D7B73] uppercase">
                      EIP-191 SECP256K1 SIGNATURE
                    </div>
                    <div className="text-[#A8A59B] break-all mt-0.5 text-[11px]">
                      {att.signature}
                    </div>
                  </div>

                  {att.settlementTx && (
                    <div className="md:col-span-2">
                      <div className="text-[10px] text-[#7D7B73] uppercase">
                        X402 AUSD SETTLEMENT TX (BASE SEPOLIA)
                      </div>
                      <a
                        href={`https://sepolia.basescan.org/tx/${att.settlementTx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#16A34A] hover:underline break-all mt-0.5 text-[11px] inline-flex items-center gap-1"
                      >
                        <span>{att.settlementTx}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  {check && (
                    <div className="md:col-span-2 pt-2.5 border-t border-[#2B2B2B] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="text-[#16A34A]">
                        REQUEST HASH MATCH:{" "}
                        {check.requestHashMatches ? "PASS" : "FAIL"}
                      </div>
                      <div className="text-[#16A34A]">
                        ECRECOVER MATCH:{" "}
                        {check.signerMatchesDeclared ? "PASS" : "FAIL"}
                      </div>
                      <div className="text-[#A8A59B] truncate">
                        RECOVERED: {check.recoveredAddress || "N/A"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Raw Upstream JSON Payload */}
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPayload(isExpanded ? null : att.id)
                    }
                    className="font-mono text-[11px] uppercase tracking-wider text-[#B8B5AA] hover:text-[#F3F1EA] cursor-pointer underline underline-offset-4"
                  >
                    {isExpanded
                      ? "HIDE RAW SIGNED JSON PAYLOAD"
                      : "INSPECT RAW SIGNED JSON PAYLOAD"}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
                      <div className="bg-[#111111] border border-[#2B2B2B] p-3">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7D7B73] mb-2">
                          SIGNED PARAMETERS
                        </div>
                        <pre className="font-mono text-[11px] text-[#D6D3C9] overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                          {JSON.stringify(att.parameters, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-[#111111] border border-[#2B2B2B] p-3">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7D7B73] mb-2">
                          RAW UPSTREAM RESPONSE BYTES ({att.data.length} CHARS)
                        </div>
                        <pre className="font-mono text-[11px] text-[#A8A59B] overflow-x-auto max-h-64">
                          {formatPrettyJson(att.data)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
