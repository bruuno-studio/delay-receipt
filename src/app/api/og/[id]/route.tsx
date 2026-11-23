import { NextRequest } from "next/server";
import { renderBoardingPassOgPng, renderNotFoundOgPng } from "@/lib/ogPng";
import { getProofById } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const proof = await getProofById(id);
  const isDownload = request.nextUrl.searchParams.get("download") === "1";

  const pngBytes = proof
    ? await renderBoardingPassOgPng(proof)
    : await renderNotFoundOgPng(id);

  const body = new Uint8Array(pngBytes.byteLength);
  body.set(pngBytes);

  const headers = new Headers({
    "Content-Type": "image/png",
    "Content-Length": String(body.byteLength),
    "Cache-Control": "public, max-age=300, s-maxage=3600",
  });

  if (isDownload && proof) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="delay-receipt-${proof.flightNumber}-${proof.flightDate}.png"`
    );
  }

  return new Response(body, {
    status: 200,
    headers,
  });
}
