"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";

interface AmbientTrack {
  id: string;
  title: string;
  url: string;
}

const SELECTED_STORAGE_KEY = "kekere-ambient-sound-id";
const VOLUME_STORAGE_KEY = "kekere-ambient-volume";
const DEFAULT_VOLUME = 0.4;

export interface AmbientSoundMenuProps {
  /** Matches the reader's current background theme, same as the palette dropdown. */
  themeBg: string;
  themeBorder: string;
}

/**
 * Headphone-icon menu next to the background-colour picker: lets a reader
 * loop a quiet white-noise track (rain, cafe, etc.) while they read. Sounds
 * are fetched lazily on first open, not on page load, to stay non-intrusive.
 * Playback continues while the menu is closed — only stops when the reader
 * pauses it or leaves the story.
 */
export function AmbientSoundMenu({ themeBg, themeBorder }: AmbientSoundMenuProps) {
  const [open, setOpen] = useState(false);
  const [sounds, setSounds] = useState<AmbientTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Preload the last-picked track id + volume so returning readers see their
  // preference pre-selected — but never autoplay on mount: browsers block
  // unprompted audio anyway, and it keeps the feature non-intrusive.
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(SELECTED_STORAGE_KEY);
      if (savedId) setSelectedId(savedId);
      const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (savedVolume) {
        const parsed = Number(savedVolume);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) setVolume(parsed);
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // ignore unavailable storage
    }
  }, [volume]);

  // Stop playback the moment this reader unmounts (leaving the story) so
  // audio never keeps looping in the background after navigating away.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  function loadSounds() {
    if (sounds !== null || loading) return;
    setLoading(true);
    setError(false);
    fetch("/api/kekere/ambient-sounds")
      .then((r) => r.json())
      .then((d) => setSounds(d.sounds ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  function selectTrack(track: AmbientTrack) {
    const audio = audioRef.current;
    if (!audio) return;

    if (selectedId === track.id && playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (selectedId !== track.id) {
      audio.src = track.url;
    }
    audio.volume = volume;
    audio.play().catch(() => {});
    setSelectedId(track.id);
    setPlaying(true);
    try {
      localStorage.setItem(SELECTED_STORAGE_KEY, track.id);
    } catch {
      // ignore unavailable storage
    }
  }

  function togglePlayPause() {
    const audio = audioRef.current;
    const track = sounds?.find((s) => s.id === selectedId);
    if (!audio || !track) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (!audio.src) audio.src = track.url;
      audio.volume = volume;
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }

  const selectedTrack = sounds?.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        aria-label="Background sound"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          loadSounds();
        }}
        className="bg-none text-[17px] transition-colors hover:text-[var(--color-primary)]"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: open || playing ? "var(--color-primary)" : "var(--color-ink-muted)",
        }}
      >
        <Headphones className="h-[17px] w-[17px]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close background sound menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[55] cursor-default"
            style={{ background: "transparent", border: "none" }}
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+12px)] z-[56] w-[220px] animate-scale-in rounded-[12px] border p-2 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.45)]"
            style={{ backgroundColor: themeBg, borderColor: themeBorder }}
          >
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-3)]">
              Background sound
            </p>

            {loading && (
              <p className="px-2 py-2 text-[12.5px] text-[var(--color-ink-muted)]">Loading…</p>
            )}
            {error && (
              <p className="px-2 py-2 text-[12.5px] text-[var(--color-ink-muted)]">Couldn&apos;t load sounds.</p>
            )}
            {!loading && !error && sounds?.length === 0 && (
              <p className="px-2 py-2 text-[12.5px] text-[var(--color-ink-muted)]">No sounds available yet.</p>
            )}

            {sounds?.map((track) => {
              const active = track.id === selectedId && playing;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => selectTrack(track)}
                  className="flex w-full items-center gap-[10px] rounded-[8px] px-2 py-[9px] text-left text-[13.5px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <span className="flex-1">{track.title}</span>
                  {active ? (
                    <Pause className="h-[14px] w-[14px] flex-none text-[var(--color-primary)]" />
                  ) : (
                    <Play className="h-[13px] w-[13px] flex-none text-[var(--color-ink-muted-3)]" />
                  )}
                </button>
              );
            })}

            {selectedTrack && (
              <div className="mt-1 flex items-center gap-2 border-t px-2 pt-2" style={{ borderColor: themeBorder }}>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={playing ? "Pause background sound" : "Play background sound"}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ink-muted)" }}
                >
                  {playing ? <Pause className="h-[14px] w-[14px]" /> : <Play className="h-[14px] w-[14px]" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  aria-label="Background sound volume"
                  className="flex-1 accent-[var(--color-primary)]"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- ambient white noise, no captionable content */}
      <audio ref={audioRef} loop />
    </div>
  );
}
