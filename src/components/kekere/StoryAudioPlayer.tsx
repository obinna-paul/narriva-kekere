"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getParagraphWordRanges, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

type AudioInfo =
  | { type: "remote"; url: string; durationSecs: number | null }
  | { type: "browser_tts"; text: string; durationSecs: number };

export interface StoryAudioPlayerProps {
  storyId: string;
  storyTitle?: string;
  bodyDoc: TiptapDoc | null;
  containerRef: React.RefObject<HTMLElement>;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pickSpeechLang(): string {
  if (typeof window === "undefined" || !window.speechSynthesis) return "en";
  const voices = window.speechSynthesis.getVoices();
  return voices.some((v) => v.lang === "en-NG") ? "en-NG" : "en";
}

export function StoryAudioPlayer({ storyId, storyTitle, bodyDoc, containerRef }: StoryAudioPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [seekNote, setSeekNote] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const seekNoteTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const paragraphRanges = useMemo(() => (bodyDoc ? getParagraphWordRanges(bodyDoc) : []), [bodyDoc]);
  const totalWords = paragraphRanges.reduce((sum, r) => sum + r.words, 0);

  const highlightedParagraphId = useMemo(() => {
    if (!playing || duration <= 0 || totalWords === 0) return null;
    const targetWord = (currentTime / duration) * totalWords;
    const match = paragraphRanges.find(
      (r) => targetWord >= r.wordsBefore && targetWord < r.wordsBefore + r.words
    );
    return match?.id ?? null;
  }, [playing, currentTime, duration, totalWords, paragraphRanges]);

  // B6.5 — keep active paragraph in view while playing
  useEffect(() => {
    if (!highlightedParagraphId || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-paragraph-id="${highlightedParagraphId}"]`
    );
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!alreadyVisible) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedParagraphId, containerRef]);

  // Progress bar drag — global mouse/pointer listeners while seeking
  useEffect(() => {
    if (!seeking) return;
    function seekFromX(clientX: number) {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newTime = ratio * duration;
      setCurrentTime(newTime);
      if (audioRef.current) audioRef.current.currentTime = newTime;
    }
    function onMove(e: PointerEvent) { seekFromX(e.clientX); }
    function onUp() { setSeeking(false); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeking, duration]);

  async function ensureAudioInfo(): Promise<AudioInfo | null> {
    if (audioInfo) return audioInfo;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/audio`);
      if (!res.ok) throw new Error("Couldn't load audio for this story.");
      const data: AudioInfo = await res.json();
      setAudioInfo(data);
      setDuration(data.durationSecs ?? 0);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load audio.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    setExpanded(true);
    await ensureAudioInfo();
  }

  function speakFromBeginning(info: AudioInfo & { type: "browser_tts" }, rate: number) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(info.text);
    utterance.lang = pickSpeechLang();
    utterance.rate = rate;
    utterance.onboundary = (e) => {
      const fraction = e.charIndex / info.text.length;
      setCurrentTime(fraction * info.durationSecs);
    };
    utterance.onend = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  async function handlePlayPause() {
    const info = await ensureAudioInfo();
    if (!info) return;

    if (info.type === "remote") {
      const el = audioRef.current;
      if (!el) return;
      if (playing) { el.pause(); } else { await el.play().catch(() => setError("Couldn't play audio.")); }
      return;
    }

    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setPlaying(true);
    } else {
      speakFromBeginning(info, speed);
    }
  }

  function flashSeekNote() {
    setSeekNote(true);
    clearTimeout(seekNoteTimerRef.current);
    seekNoteTimerRef.current = setTimeout(() => setSeekNote(false), 2400);
  }

  function handleSeek(newTime: number) {
    if (isTts) { flashSeekNote(); return; }
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }

  function handleSkip(delta: number) {
    if (isTts) { flashSeekNote(); return; }
    handleSeek(Math.max(0, Math.min(duration, currentTime + delta)));
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    if (audioInfo?.type === "browser_tts" && playing) {
      speakFromBeginning(audioInfo, newSpeed);
    }
  }

  function handleProgressPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isTts) { flashSeekNote(); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    setSeeking(true);
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      clearTimeout(seekNoteTimerRef.current);
    };
  }, []);

  const isTts = audioInfo?.type === "browser_tts";
  const started = currentTime > 0 && duration > 0 && currentTime < duration;
  const progressPct = duration > 0 ? `${(currentTime / duration) * 100}%` : "0%";
  const progressColor = isTts ? "#9A6A3F" : "#E0894F";
  const skipOpacity = isTts ? 0.4 : 1;
  const nowPlayingLabel = isTts ? "Preview voice" : "Now listening";
  const timeLabel = `${isTts ? "~" : ""}${formatTime(currentTime)} / ${isTts ? "~" : ""}${formatTime(duration)}`;
  const modeDotColor = audioInfo ? (audioInfo.type === "remote" ? "#1F4B4B" : "#9A6A3F") : "#1F4B4B";

  // B6.2 — collapsed: small floating icon in bottom-right corner
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        aria-label="Listen to this story"
        className="fixed bottom-4 right-4 z-30 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2A1A12] shadow-[0_10px_28px_rgba(42,26,18,.34)] transition-transform hover:scale-105 active:scale-95"
      >
        {/* Orange ring when playback has started */}
        {started && (
          <span className="absolute inset-0 rounded-full border-2 border-[#E0894F]" />
        )}
        {/* Mode indicator dot */}
        <span
          className="absolute h-[13px] w-[13px] rounded-full border-2 border-[#F5EBDD]"
          style={{ top: "-1px", right: "-1px", backgroundColor: modeDotColor }}
        />
        {/* Headphones SVG */}
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4 14.5A2.5 2.5 0 0 1 6.5 12H7v6h-.5A2.5 2.5 0 0 1 4 15.5v-1zM20 14.5A2.5 2.5 0 0 0 17.5 12H17v6h.5a2.5 2.5 0 0 0 2.5-2.5v-1z" fill="currentColor"/>
        </svg>
      </button>
    );
  }

  // B6.3 — expanded: dark panel with "Now listening" eyebrow and ±15s skip
  return (
    <>
      {/* Keyframes + paragraph highlight */}
      <style>{`
        @keyframes kkAudioUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes kkAudioPulse { 0%, 100% { background: rgba(31,75,75,.085); } 50% { background: rgba(31,75,75,.14); } }
        ${highlightedParagraphId ? `
          [data-paragraph-id="${highlightedParagraphId}"] {
            box-shadow: inset 3px 0 0 0 #1F4B4B;
            background: rgba(31,75,75,.10) !important;
            border-radius: 4px;
            animation: kkAudioPulse 2.4s ease-in-out infinite;
            transition: background .2s ease;
          }
        ` : ""}
      `}</style>

      {audioInfo?.type === "remote" && (
        <audio
          ref={audioRef}
          src={audioInfo.url}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-[20px] bg-[#2A1A12] px-[18px] pb-5 pt-4 text-[#F5EBDD] shadow-[0_-14px_44px_rgba(42,26,18,.4)]"
        style={{ animation: "kkAudioUp .3s cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Eyebrow row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E0894F]">
            {nowPlayingLabel}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Collapse player"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[rgba(245,235,221,.1)] text-[15px] text-[#F5EBDD]"
          >
            ⌄
          </button>
        </div>

        {/* TTS fallback banner */}
        {isTts && (
          <div className="mb-[14px] flex items-start gap-2 rounded-[10px] border border-[rgba(224,137,79,.3)] bg-[rgba(224,137,79,.14)] px-[11px] py-[9px]">
            <span className="flex-none text-[13px]">ⓘ</span>
            <span className="text-[12px] leading-[1.45] text-[rgba(245,235,221,.85)]">
              Enhanced audio is being prepared. You&apos;re hearing the preview version.
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div
          ref={progressBarRef}
          onPointerDown={handleProgressPointerDown}
          className="relative mb-[6px] flex h-[18px] items-center"
          style={{ cursor: isTts ? "not-allowed" : "pointer" }}
        >
          {/* Track background */}
          <div className="absolute left-0 right-0 h-[6px] rounded-[3px] bg-[rgba(245,235,221,.18)]" />
          {/* Fill */}
          <div
            className="absolute left-0 h-[6px] rounded-[3px]"
            style={{ width: progressPct, background: progressColor }}
          />
          {/* Handle */}
          <span
            className="absolute h-[14px] w-[14px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,.3)]"
            style={{ left: progressPct, background: progressColor, transform: "translateX(-7px)" }}
          />
        </div>

        {/* Time + seek note */}
        <div className="mb-[14px] flex items-center justify-between text-[12px] tabular-nums text-[rgba(245,235,221,.7)]">
          <span>{timeLabel}</span>
          {seekNote && (
            <span className="font-semibold text-[#E0894F]">
              Seeking is not available in preview mode.
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="mb-4 flex items-center justify-center gap-[22px]">
          {/* −15s */}
          <button
            type="button"
            onClick={() => handleSkip(-15)}
            aria-label="Rewind 15 seconds"
            className="flex flex-col items-center gap-[2px] border-none bg-transparent text-[#F5EBDD]"
            style={{ opacity: skipOpacity, cursor: isTts ? "not-allowed" : "pointer" }}
          >
            <span className="text-[20px]">↺</span>
            <span className="text-[9.5px] font-semibold">15s</span>
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={loading}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#C75D2C] text-[24px] text-white shadow-[0_6px_18px_rgba(199,93,44,.45)] disabled:opacity-50"
          >
            {playing ? "❚❚" : "▶"}
          </button>

          {/* +15s */}
          <button
            type="button"
            onClick={() => handleSkip(15)}
            aria-label="Skip 15 seconds"
            className="flex flex-col items-center gap-[2px] border-none bg-transparent text-[#F5EBDD]"
            style={{ opacity: skipOpacity, cursor: isTts ? "not-allowed" : "pointer" }}
          >
            <span className="text-[20px]">↻</span>
            <span className="text-[9.5px] font-semibold">15s</span>
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-center gap-[6px]">
          <span className="mr-[2px] text-[11px] text-[rgba(245,235,221,.5)]">Speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeedChange(s)}
              className="rounded-[8px] border-none px-[10px] py-[6px] text-[12px] font-bold"
              style={
                speed === s
                  ? { background: "#E0894F", color: "#1A1009" }
                  : { background: "rgba(245,235,221,.1)", color: "rgba(245,235,221,.75)" }
              }
            >
              {s === 1 ? "1" : String(s)}×
            </button>
          ))}
        </div>

        {error && <p className="mt-2 text-[11px] text-[#E0894F]">{error}</p>}
      </div>
    </>
  );
}
