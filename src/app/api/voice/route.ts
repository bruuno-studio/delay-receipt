import { NextRequest, NextResponse } from "next/server";
import { getServerSecret } from "@/lib/cfEnv";

export const dynamic = "force-dynamic";

/**
 * Provider-agnostic TTS / voice-agent proxy.
 * Uses ElevenLabs or OpenAI TTS if configured as server secrets; otherwise returns
 * a structured fallback directive so the browser uses Web Speech API + Web Audio PA filter.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      script?: string;
    };
    const script = (body.script || "").trim();
    if (!script || script.length > 800) {
      return NextResponse.json(
        { error: "Announcement script is required and must be under 800 characters." },
        { status: 400 }
      );
    }

    const elevenKey = await getServerSecret("ELEVENLABS_API_KEY");
    if (elevenKey) {
      const voiceId =
        (await getServerSecret("ELEVENLABS_VOICE_ID")) || "pNInz6obpgDQGcFmaJgB";
      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: script,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.72,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        return new NextResponse(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "X-Voice-Provider": "elevenlabs",
          },
        });
      }
    }

    const openAiKey = await getServerSecret("OPENAI_API_KEY");
    if (openAiKey) {
      const voice = (await getServerSecret("OPENAI_TTS_VOICE")) || "onyx";
      const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice,
          input: script,
          response_format: "mp3",
        }),
      });

      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        return new NextResponse(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "X-Voice-Provider": "openai",
          },
        });
      }
    }

    return NextResponse.json({
      fallback: "web-speech",
      script,
    });
  } catch (err) {
    return NextResponse.json(
      {
        fallback: "web-speech",
        error: err instanceof Error ? err.message : "Voice proxy unavailable",
      },
      { status: 200 }
    );
  }
}
