"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Square, Volume2 } from "@/components/Icons";
import {
  playTerminalPaAnnouncement,
  type PaPlaybackHandle,
} from "@/lib/audioPa";

interface AirportAnnouncementProps {
  proofId: string;
  flightNumber: string;
  script: string;
}

export function AirportAnnouncement({
  proofId,
  flightNumber,
  script,
}: AirportAnnouncementProps) {
  const [status, setStatus] = useState<"idle" | "chime" | "speaking">("idle");
  const [voiceMode, setVoiceMode] = useState<"tts" | "web-speech" | null>(null);
  const handleRef = useRef<PaPlaybackHandle | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
    };
  }, []);

  async function handleTogglePlay() {
    if (status !== "idle") {
      handleRef.current?.stop();
      handleRef.current = null;
      setStatus("idle");
      return;
    }

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "voice_plays",
        proofId,
        meta: { flightNumber },
      }),
    }).catch(() => {});

    try {
      const handle = await playTerminalPaAnnouncement({
        script,
        onStateChange: (next, mode) => {
          setStatus(next);
          if (mode) setVoiceMode(mode);
        },
      });
      handleRef.current = handle;
    } catch {
      setStatus("idle");
    }
  }

  const isPlaying = status !== "idle";

  return (
    <section
      aria-label="Terminal PA Verdict Announcement"
      className="border border-[#2B2B2B] bg-[#181818] p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#F3F1EA]">
            <Radio
              className={`w-4 h-4 ${
                isPlaying ? "text-[#D92D20]" : "text-[#8E8C84]"
              }`}
            />
            <span>TERMINAL PA ANNOUNCEMENT</span>
            <span className="text-[10px] font-normal px-2 py-0.5 border border-[#2B2B2B] bg-[#111111] text-[#A8A59B]">
              300HZ TO 3400HZ BANDPASS
            </span>
          </div>
          <p className="font-mono text-xs text-[#A8A59B] leading-relaxed max-w-3xl">
            &ldquo;{script}&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isPlaying && (
            <div className="hidden sm:flex items-end gap-1 h-6 px-2">
              {[40, 85, 55, 95, 65, 80, 45].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-[#D92D20] animate-pulse"
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`h-11 px-5 font-mono text-xs font-bold uppercase tracking-[0.16em] flex items-center gap-2.5 border transition-colors cursor-pointer ${
              isPlaying
                ? "border-[#D92D20] bg-[#D92D20] text-[#F3F1EA]"
                : "border-[#F3F1EA] bg-[#111111] hover:bg-[#F3F1EA] hover:text-[#121212] text-[#F3F1EA]"
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>
                  {status === "chime" ? "CHIME ACTIVE" : "STOP PA"}
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>PLAY VERDICT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isPlaying && (
        <div className="mt-3 pt-3 border-t border-[#2B2B2B] font-mono text-[11px] text-[#8E8C84] flex items-center justify-between">
          <span>
            STATUS:{" "}
            {status === "chime"
              ? "SYNTHETIC 2-TONE CONCOURSE CHIME"
              : `TRANSMITTING VERDICT (${voiceMode === "tts" ? "EXTERNAL TTS VOICE" : "WEB SPEECH PA ENGINE"})`}
          </span>
          <span>GATE BROADCAST · {flightNumber}</span>
        </div>
      )}
    </section>
  );
}
