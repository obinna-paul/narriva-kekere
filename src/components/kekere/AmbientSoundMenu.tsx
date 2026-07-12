"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Bird,
  CloudRain,
  Coffee,
  Flame,
  Headphones,
  Moon,
  Music2,
  Pause,
  Play,
  TreePine,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

interface AmbientTrack {
  id: string;
  title: string;
  url: string;
}

const SELECTED_STORAGE_KEY = "kekere-ambient-sound-id";
const VOLUME_STORAGE_KEY = "kekere-ambient-volume";
const DEFAULT_VOLUME = 0.4;

/** Purely cosmetic — picks a fitting icon from the track's title so the list
 *  reads at a glance without asking the admin to manage icons per track. */
function iconForTitle(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/rain|drizzle|storm|thunder/.test(t)) return CloudRain;
  if (/cafe|café|coffee|chatter/.test(t)) return Coffee;
  if (/forest|tree|nature|wood|jungle|leaves/.test(t)) return TreePine;
  if (/ocean|sea|wave|beach|shore|river|stream|water/.test(t)) return Waves;
  if (/fire|crackl|camp|hearth/.test(t)) return Flame;
  if (/wind|breeze|air/.test(t)) return Wind;
  if (/night|moon|sleep|dream/.test(t)) return Moon;
  if (/bird|morning|dawn|meadow/.test(t)) return Bird;
  return Music2;
}

/** Three bars bouncing out of sync — the familiar "now playing" tell. */
function EqualizerBars() {
  return (
    <span
      className="flex h-[13px] flex-none items-end gap-[2px]"
      aria-hidden="true"
    >
      <span
        className="w-[3px] origin-bottom animate-eq-bar rounded-full [animation-delay:0ms]"
        style={{ height: 13, backgroundColor: "var(--color-primary)" }}
      />
      <span
        className="w-[3px] origin-bottom animate-eq-bar rounded-full [animation-delay:180ms]"
        style={{ height: 13, backgroundColor: "var(--color-primary)" }}
      />
      <span
        className="w-[3px] origin-bottom animate-eq-bar rounded-full [animation-delay:340ms]"
        style={{ height: 13, backgroundColor: "var(--color-primary)" }}
      />
    </span>
  );
}

export interface AmbientSoundMenuHandle {
  /** Pauses playback without clearing the selection, so re-opening the menu
   *  still shows what was picked — just silent. Used when the reader taps
   *  "I finished this" and stays on the page (unmounting already handles
   *  leaving the story entirely). */
  stop: () => void;
}

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
 * pauses it, finishes the story, or leaves it.
 */
export const AmbientSoundMenu = forwardRef<
  AmbientSoundMenuHandle,
  AmbientSoundMenuProps
>(function AmbientSoundMenu({ themeBg, themeBorder }, ref) {
  const [open, setOpen] = useState(false);
  const [sounds, setSounds] = useState<AmbientTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lastVolumeRef = useRef(DEFAULT_VOLUME);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    stop: () => {
      audioRef.current?.pause();
      setPlaying(false);
    },
  }));

  // Close on outside click/tap or Escape. Deliberately not a fixed-overlay
  // backdrop: the header this menu lives in has backdrop-blur, which per
  // spec makes it a containing block for position:fixed descendants — a
  // "fixed inset-0" backdrop nested inside it only covers the header's own
  // box, not the viewport, so clicks anywhere in the story body would never
  // reach it. A document-level listener has no such pitfall.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          setVolume(parsed);
          if (parsed > 0) lastVolumeRef.current = parsed;
        }
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (volume > 0) lastVolumeRef.current = volume;
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

    // loop handles short tracks restarting on their own — switching tracks
    // is the only thing that should ever interrupt a loop mid-play.
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

  function toggleMute() {
    setVolume((v) => (v > 0 ? 0 : lastVolumeRef.current || DEFAULT_VOLUME));
  }

  const selectedTrack = sounds?.find((s) => s.id === selectedId) ?? null;
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        type="button"
        aria-label="Background sound"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          loadSounds();
        }}
        className="relative bg-none text-[17px] transition-colors hover:text-[var(--color-primary)]"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color:
            open || playing ? "var(--color-primary)" : "var(--color-ink-muted)",
        }}
      >
        <Headphones className="h-[17px] w-[17px]" />
        {playing && (
          <span
            className="absolute -right-[1px] -top-[1px] flex h-[7px] w-[7px]"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-75" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[var(--color-primary)]" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+12px)] z-[56] w-[252px] animate-scale-in overflow-hidden rounded-[16px] border shadow-[0_20px_50px_-18px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeBg} 92%, transparent)`,
            borderColor: themeBorder,
          }}
        >
          <div className="px-3 pb-2 pt-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-3)]">
              Background sound
            </p>
            <p className="mt-[2px] text-[11.5px] text-[var(--color-ink-muted-2)]">
              Loop something quiet while you read
            </p>
          </div>

          <div className="max-h-[240px] overflow-y-auto px-2 pb-2">
            {loading && (
              <p className="px-2 py-3 text-[12.5px] text-[var(--color-ink-muted)]">
                Loading…
              </p>
            )}
            {error && (
              <p className="px-2 py-3 text-[12.5px] text-[var(--color-ink-muted)]">
                Couldn&apos;t load sounds.
              </p>
            )}
            {!loading && !error && sounds?.length === 0 && (
              <p className="px-2 py-3 text-[12.5px] text-[var(--color-ink-muted)]">
                No sounds available yet.
              </p>
            )}

            {sounds?.map((track) => {
              const active = track.id === selectedId && playing;
              const Icon = iconForTitle(track.title);
              return (
                <button
                  key={track.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => selectTrack(track)}
                  className="group flex w-full items-center gap-[10px] rounded-[10px] px-[6px] py-[7px] text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full transition-colors"
                    style={{
                      backgroundColor: active
                        ? "var(--color-primary)"
                        : "color-mix(in srgb, var(--color-ink) 8%, transparent)",
                    }}
                  >
                    <Icon
                      className="h-[14px] w-[14px]"
                      style={{
                        color: active ? "#fff" : "var(--color-ink-muted)",
                      }}
                    />
                  </span>
                  <span
                    className="flex-1 truncate text-[13.5px] font-medium"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {track.title}
                  </span>
                  {active ? (
                    <EqualizerBars />
                  ) : (
                    <Play className="h-[12px] w-[12px] flex-none text-[var(--color-ink-muted-3)] opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedTrack && (
            <div
              className="flex items-center gap-[10px] border-t px-3 py-[10px]"
              style={{ borderColor: themeBorder }}
            >
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={
                  playing ? "Pause background sound" : "Play background sound"
                }
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-white transition-transform active:scale-90"
                style={{
                  background: "var(--color-primary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {playing ? (
                  <Pause className="h-[13px] w-[13px]" fill="currentColor" />
                ) : (
                  <Play
                    className="ml-[1px] h-[13px] w-[13px]"
                    fill="currentColor"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                className="flex-none"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted-3)",
                }}
              >
                <VolumeIcon className="h-[14px] w-[14px]" />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Background sound volume"
                className="h-1 flex-1 accent-[var(--color-primary)]"
              />
            </div>
          )}
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- ambient white noise, no captionable content */}
      <audio ref={audioRef} loop />
    </div>
  );
});
