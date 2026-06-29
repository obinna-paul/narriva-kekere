"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Play, Pause, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getParagraphWordRanges, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

type AudioInfo =
  | { type: "remote"; url: string; durationSecs: number | null }
  | { type: "browser_tts"; text: string; durationSecs: number };

export interface StoryAudioPlayerProps {
  storyId: string;
  bodyDoc: TiptapDoc | null;
  /** Same content container used for comments/reactions — paragraphs are
   * found by data-paragraph-id within it. */
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

export function StoryAudioPlayer({ storyId, bodyDoc, containerRef }: StoryAudioPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      if (playing) {
        el.pause();
      } else {
        await el.play().catch(() => setError("Couldn't play audio."));
      }
      return;
    }

    // browser_tts
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

  function handleSeek(newTime: number) {
    setCurrentTime(newTime);
    if (audioInfo?.type === "remote" && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    // browser_tts has no real seek — dragging just restarts from the
    // beginning (see the tooltip on the progress bar below).
    else if (audioInfo?.type === "browser_tts" && playing) {
      speakFromBeginning(audioInfo, speed);
    }
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    // Web Speech's rate is fixed at speak()-time — changing it mid-playback
    // requires restarting the utterance at the new rate.
    if (audioInfo?.type === "browser_tts" && playing) {
      speakFromBeginning(audioInfo, newSpeed);
    }
  }

  function handleCollapse() {
    setExpanded(false);
    // Collapsing does not stop playback — per spec, only closes the bar.
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,26,18,0.4)]"
      >
        <Headphones size={15} />
        Listen to this story
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-ink)]/10 bg-[var(--color-bg)] px-4 py-3 shadow-[0_-10px_30px_-15px_rgba(42,26,18,0.3)]">
      {highlightedParagraphId && (
        <style>{`
          [data-paragraph-id="${highlightedParagraphId}"] {
            border-left: 3px solid var(--color-primary);
            margin-left: -13px;
            padding-left: 10px;
            border-radius: 4px;
            transition: background-color 0.15s ease;
          }
        `}</style>
      )}

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

      {audioInfo?.type === "browser_tts" && (
        <p className="mb-2 rounded-md bg-[var(--color-primary-muted)] px-3 py-1.5 text-[11px] text-[var(--color-primary)]">
          Enhanced audio is being prepared. You&apos;re hearing the preview version.
        </p>
      )}

      {error && <p className="mb-2 text-[11px] text-[#A13A3A]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={loading}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            title={
              audioInfo?.type === "browser_tts"
                ? "Seeking is only available for processed audio"
                : undefined
            }
            className="h-1.5 w-full cursor-pointer accent-[var(--color-primary)]"
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-muted-2)]">
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                    speed === s
                      ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                      : "text-[var(--color-ink-muted-3)] hover:text-[var(--color-ink)]"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCollapse}
          aria-label="Collapse player"
          className="flex-none text-[var(--color-ink-muted-2)] hover:text-[var(--color-ink)]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
