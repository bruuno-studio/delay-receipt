import {
  encodePacked,
  keccak256,
  recoverMessageAddress,
  stringToHex,
  toHex,
  verifyMessage,
} from "viem";
import type { AirnodeAttestationRecord } from "./types";

/**
 * AirnodeHub canonical JSON value serializer.
 * Replaces every plain object recursively with an array of [key, canonical(val)]
 * sorted by Unicode code point order (UTF-8 byte order), matching AirnodeHub spec.
 */
export function canonicalizeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return keys.map((k) => [k, canonicalizeValue(obj[k])]);
}

/**
 * Exact AirnodeHub POST / requestHash algorithm:
 * requestHash = keccak256(utf8(JSON.stringify([operation, canonical(parameters)])))
 */
export function computeAirnodeRequestHash(
  operation: string,
  parameters: Record<string, unknown>,
  responseProjection?: Record<string, string>
): `0x${string}` {
  const tuple: unknown[] = [operation, canonicalizeValue(parameters)];
  if (responseProjection && Object.keys(responseProjection).length > 0) {
    tuple.push(canonicalizeValue(responseProjection));
  }
  const serialized = JSON.stringify(tuple);
  return keccak256(stringToHex(serialized));
}

/**
 * Exact AirnodeHub EIP-191 digest algorithm:
 * digest = keccak256(abi.encodePacked(bytes32 requestHash, uint256 timestamp, bytes dataBytes))
 */
export function computeAirnodeDigest(params: {
  requestHash: `0x${string}`;
  timestamp: string;
  data: string;
}): `0x${string}` {
  const dataHex = toHex(new TextEncoder().encode(params.data));
  return keccak256(
    encodePacked(
      ["bytes32", "uint256", "bytes"],
      [params.requestHash, BigInt(params.timestamp), dataHex]
    )
  );
}

export interface AttestationVerificationResult {
  id: string;
  valid: boolean;
  requestHashMatches: boolean;
  signatureValid: boolean;
  signerMatchesDeclared: boolean;
  recoveredAddress: string | null;
  computedRequestHash: `0x${string}`;
  computedDigest: `0x${string}`;
  error?: string;
}

/**
 * Cryptographically verifies an AirnodeHub attestation locally (browser or server)
 * without trusting any remote verify endpoint.
 */
export async function verifyAirnodeAttestation(
  record: AirnodeAttestationRecord
): Promise<AttestationVerificationResult> {
  try {
    const computedRequestHash = computeAirnodeRequestHash(
      record.operation,
      record.parameters
    );
    const requestHashMatches =
      computedRequestHash.toLowerCase() === record.requestHash.toLowerCase();

    const computedDigest = computeAirnodeDigest({
      requestHash: record.requestHash,
      timestamp: record.timestamp,
      data: record.data,
    });

    const recoveredAddress = await recoverMessageAddress({
      message: { raw: computedDigest },
      signature: record.signature,
    });

    const signatureValid = await verifyMessage({
      address: record.airnode,
      message: { raw: computedDigest },
      signature: record.signature,
    });

    const signerMatchesDeclared =
      recoveredAddress.toLowerCase() === record.airnode.toLowerCase();

    return {
      id: record.id,
      valid: requestHashMatches && signatureValid && signerMatchesDeclared,
      requestHashMatches,
      signatureValid,
      signerMatchesDeclared,
      recoveredAddress,
      computedRequestHash,
      computedDigest,
    };
  } catch (err) {
    return {
      id: record.id,
      valid: false,
      requestHashMatches: false,
      signatureValid: false,
      signerMatchesDeclared: false,
      recoveredAddress: null,
      computedRequestHash: "0x0" as `0x${string}`,
      computedDigest: "0x0" as `0x${string}`,
      error: err instanceof Error ? err.message : "Verification failed",
    };
  }
}
