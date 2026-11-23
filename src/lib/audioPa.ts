"use client";

/**
 * Terminal PA Audio Engine
 * Synthesizes a 2-tone airport concourse chime and routes TTS playback through
 * a Web Audio API bandpass filter (300Hz to 3400Hz) + subtle PA speaker compression.
 */

export interface PaPlaybackHandle {
  stop: () => void;
}

function getAudioContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  return new Ctor();
}

/**
 * Builds the 300Hz to 3400Hz telephone/terminal PA bandpass filter chain.
 */
function buildPaFilterChain(ctx: AudioContext): {
  input: AudioNode;
  output: AudioNode;
} {
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 300;
  highpass.Q.value = 0.85;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3400;
  lowpass.Q.value = 0.85;

  // Mid-presence horn resonance around 1.4kHz
  const hornPeak = ctx.createBiquadFilter();
  hornPeak.type = "peaking";
  hornPeak.frequency.value = 1450;
  hornPeak.Q.value = 1.2;
  hornPeak.gain.value = 4.5;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.92;

  highpass.connect(lowpass);
  lowpass.connect(hornPeak);
  hornPeak.connect(compressor);
  compressor.connect(masterGain);

  return { input: highpass, output: masterGain };
}

/**
 * Synthesizes a classic two-tone airport terminal chime (F#5 -> D5) with soft bell decay.
 */
export function playAirportChime(
  ctx: AudioContext,
  destination: AudioNode
): Promise<void> {
  return new Promise((resolve) => {
    const now = ctx.currentTime + 0.04;
    const notes = [
      { freq: 739.99, start: now, dur: 0.55 }, // F#5
      { freq: 587.33, start: now + 0.42, dur: 0.95 }, // D5
    ];

    for (const note of notes) {
      const oscMain = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();
      const harmGain = ctx.createGain();

      oscMain.type = "sine";
      oscMain.frequency.setValueAtTime(note.freq, note.start);

      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(note.freq * 2, note.start);

      gain.gain.setValueAtTime(0.0001, note.start);
      gain.gain.exponentialRampToValueAtTime(0.28, note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.start + note.dur);

      harmGain.gain.setValueAtTime(0.0001, note.start);
      harmGain.gain.exponentialRampToValueAtTime(0.07, note.start + 0.015);
      harmGain.gain.exponentialRampToValueAtTime(
        0.0001,
        note.start + note.dur * 0.65
      );

      oscMain.connect(gain);
      oscHarmonic.connect(harmGain);
      gain.connect(destination);
      harmGain.connect(destination);

      oscMain.start(note.start);
      oscHarmonic.start(note.start);
      oscMain.stop(note.start + note.dur + 0.05);
      oscHarmonic.stop(note.start + note.dur + 0.05);
    }

    // Subtle terminal PA carrier click/hiss bed during chime
    const bufferSize = Math.floor(ctx.sampleRate * 1.35);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channel[i] = (Math.random() * 2 - 1) * 0.012;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.25;
    noiseSource.connect(noiseGain);
    noiseGain.connect(destination);
    noiseSource.start(now);

    setTimeout(resolve, 1380);
  });
}

/**
 * Plays an audio ArrayBuffer (from /api/voice external TTS) through the 300-3400Hz PA filter.
 */
async function playFilteredAudioBuffer(
  ctx: AudioContext,
  paChain: { input: AudioNode; output: AudioNode },
  audioData: ArrayBuffer,
  onEnded: () => void
): Promise<PaPlaybackHandle> {
  const decoded = await ctx.decodeAudioData(audioData.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(paChain.input);

  // Light concourse ambient floor noise under the voice
  const hissLen = Math.floor(ctx.sampleRate * decoded.duration);
  const hissBuf = ctx.createBuffer(1, hissLen, ctx.sampleRate);
  const data = hissBuf.getChannelData(0);
  for (let i = 0; i < hissLen; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.006;
  }
  const hiss = ctx.createBufferSource();
  hiss.buffer = hissBuf;
  hiss.connect(paChain.input);

  let stopped = false;
  source.onended = () => {
    if (!stopped) {
      stopped = true;
      onEnded();
    }
  };

  source.start();
  hiss.start();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        source.stop();
        hiss.stop();
      } catch {
        // Already stopped
      }
      onEnded();
    },
  };
}

/**
 * Plays the complete PA verdict announcement:
 * 1. Requests /api/voice (returns audio/mpeg if external TTS key is configured, else web-speech fallback)
 * 2. Plays 2-tone airport chime through the 300Hz to 3400Hz Web Audio PA filter
 * 3. Plays TTS audio through the PA filter (or browser Web Speech API with PA hiss bed)
 */
export async function playTerminalPaAnnouncement(params: {
  script: string;
  onStateChange?: (state: "chime" | "speaking" | "idle", mode?: "tts" | "web-speech") => void;
}): Promise<PaPlaybackHandle> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const paChain = buildPaFilterChain(ctx);
  paChain.output.connect(ctx.destination);

  let cancelled = false;
  let innerStop: (() => void) | null = null;
  let hissNode: AudioBufferSourceNode | null = null;

  const cleanup = () => {
    try {
      hissNode?.stop();
    } catch {
      // ignore
    }
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    ctx.close().catch(() => {});
    params.onStateChange?.("idle");
  };

  const handle: PaPlaybackHandle = {
    stop: () => {
      cancelled = true;
      innerStop?.();
      cleanup();
    },
  };

  // Start fetching optional TTS audio in parallel with the chime so latency feels instant
  const ttsPromise = fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: params.script }),
  })
    .then(async (res) => {
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("audio/")) {
        return await res.arrayBuffer();
      }
      return null;
    })
    .catch(() => null);

  params.onStateChange?.("chime");
  await playAirportChime(ctx, paChain.input);

  if (cancelled) {
    cleanup();
    return handle;
  }

  const audioBuffer = await ttsPromise;
  if (cancelled) {
    cleanup();
    return handle;
  }

  if (audioBuffer && audioBuffer.byteLength > 256) {
    params.onStateChange?.("speaking", "tts");
    const sub = await playFilteredAudioBuffer(ctx, paChain, audioBuffer, () => {
      cleanup();
    });
    innerStop = sub.stop;
    return handle;
  }

  // Clean fallback: Web Speech API + subtle bandpass-filtered terminal PA carrier hiss
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    params.onStateChange?.("speaking", "web-speech");

    const hissLen = Math.floor(ctx.sampleRate * 16);
    const hissBuf = ctx.createBuffer(1, hissLen, ctx.sampleRate);
    const ch = hissBuf.getChannelData(0);
    for (let i = 0; i < hissLen; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.008;
    }
    hissNode = ctx.createBufferSource();
    hissNode.buffer = hissBuf;
    hissNode.connect(paChain.input);
    hissNode.start();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(params.script);
    utterance.lang = "en-GB";
    utterance.rate = 0.94;
    utterance.pitch = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /en-GB|British|Daniel|Google UK English/i.test(v.name + v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onend = () => cleanup();
    utterance.onerror = () => cleanup();

    innerStop = () => {
      window.speechSynthesis.cancel();
    };
    window.speechSynthesis.speak(utterance);
  } else {
    cleanup();
  }

  return handle;
}
