"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { renderSimpleMarkdown } from "@/lib/utils/markdown";

type FontSize = "S" | "M" | "L" | "XL";
type FontFamily = "serif" | "sans";
type LineSpacing = "comfortable" | "relaxed" | "open";
type ReaderTheme = "light" | "sepia" | "dark";

interface ReaderSettings {
  fontSize: FontSize;
  fontFamily: FontFamily;
  lineSpacing: LineSpacing;
  theme: ReaderTheme;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: "M",
  fontFamily: "serif",
  lineSpacing: "comfortable",
  theme: "light",
};

const FONT_SIZE_PX: Record<FontSize, number> = { S: 16, M: 18, L: 21, XL: 24 };
const BUTTON_LABEL_PX: Record<FontSize, number> = { S: 12, M: 13.5, L: 15, XL: 16.5 };
const LINE_HEIGHT: Record<LineSpacing, number> = { comfortable: 1.85, relaxed: 2.0, open: 2.2 };

interface ThemeColors {
  bg: string;
  text: string;
  panel: string;
  bar: string;
  border: string;
  faint: string;
  track: string;
  accent: string;
  rule: string;
  hover: string;
  watermark: string;
}

// Exact palette from the design handoff — dark mode's accent is a lighter
// blue (#7D9BEC) than the other two themes' #1E3A8A, since the brand blue
// doesn't have enough contrast against a near-black background.
const THEMES: Record<ReaderTheme, ThemeColors> = {
  light: {
    bg: "#FAF8F4", text: "#161616", panel: "#FFFFFF", bar: "rgba(250,248,244,0.92)",
    border: "rgba(22,22,22,0.1)", faint: "#8A857C", track: "rgba(22,22,22,0.1)",
    accent: "#1E3A8A", rule: "#B08D57", hover: "rgba(22,22,22,0.05)", watermark: "rgba(22,22,22,0.08)",
  },
  sepia: {
    bg: "#F2E8D9", text: "#3A2E1A", panel: "#F8F0E2", bar: "rgba(242,232,217,0.92)",
    border: "rgba(58,46,26,0.16)", faint: "#8A7A5E", track: "rgba(58,46,26,0.12)",
    accent: "#1E3A8A", rule: "#B08D57", hover: "rgba(58,46,26,0.06)", watermark: "rgba(58,46,26,0.09)",
  },
  dark: {
    bg: "#141414", text: "#E8E0D0", panel: "#1F1F1F", bar: "rgba(20,20,20,0.92)",
    border: "rgba(232,224,208,0.14)", faint: "#928C7E", track: "rgba(232,224,208,0.14)",
    accent: "#7D9BEC", rule: "#B08D57", hover: "rgba(232,224,208,0.08)", watermark: "rgba(232,224,208,0.08)",
  },
};

const STORAGE_KEY = "narriva-reader-settings";
const WORDS_PER_MINUTE = 238;

function loadSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface ChapterData {
  index: number;
  title: string;
  body: string;
}

export interface EbookReaderProps {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  chapterCount: number;
  wordCount: number;
  userEmail: string;
  initialChapter: ChapterData | null;
  initialChapterIndex: number;
  initialScrollPosition: number;
  initialCompletedChapterIds: number[];
  hadExistingProgress: boolean;
}

export function EbookReader({
  bookId,
  bookTitle,
  bookSlug,
  chapterCount,
  wordCount,
  userEmail,
  initialChapter,
  initialChapterIndex,
  initialScrollPosition,
  initialCompletedChapterIds,
  hadExistingProgress,
}: EbookReaderProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [chapter, setChapter] = useState<ChapterData | null>(initialChapter);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [completedChapterIds, setCompletedChapterIds] = useState<number[]>(initialCompletedChapterIds);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcome, setWelcome] = useState(hadExistingProgress && initialChapterIndex > 1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [loadingChapter, setLoadingChapter] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  const theme = THEMES[settings.theme];

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setChromeVisible((visible) => (settingsOpen ? visible : false));
    }, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  const saveProgress = useCallback(
    (chapterIdx: number, scrollPosition: number, completed: number[]) => {
      fetch(`/api/books/${bookId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentChapter: chapterIdx,
          currentScrollPosition: scrollPosition,
          completedChapterIds: completed,
        }),
      }).catch(() => {
        // Best-effort — losing one progress tick isn't worth surfacing to the reader.
      });
    },
    [bookId]
  );

  async function goToChapter(delta: number) {
    const index = Math.min(chapterCount, Math.max(1, chapterIndex + delta));
    if (index === chapterIndex) return;

    setLoadingChapter(true);
    const nextCompleted = completedChapterIds.includes(chapterIndex)
      ? completedChapterIds
      : [...completedChapterIds, chapterIndex];
    setCompletedChapterIds(nextCompleted);

    try {
      const res = await fetch(`/api/books/${bookId}/content?chapter=${index}`);
      if (res.ok) {
        const data = await res.json();
        setChapter({ index: data.chapterIndex, title: data.title, body: data.body });
      } else {
        setChapter(null);
      }
    } finally {
      setChapterIndex(index);
      setLoadingChapter(false);
      setScrollProgress(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      saveProgress(index, 0, nextCompleted);
      showChrome();
    }
  }

  // Page-level scroll drives the per-chapter progress fill, chrome
  // visibility, and (debounced) progress persistence — the page scrolls
  // naturally; the top/bottom bars are fixed overlays, not a clipped
  // internal scroll container.
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      setScrollProgress(pct);
      showChrome();

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveProgress(chapterIndex, window.scrollY, completedChapterIds);
      }, 5000);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goToChapter(1);
      else if (e.key === "ArrowLeft") goToChapter(-1);
    }

    showChrome();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", showChrome, { passive: true });
    window.addEventListener("touchstart", showChrome, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", showChrome);
      window.removeEventListener("touchstart", showChrome);
      window.removeEventListener("keydown", onKey);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, completedChapterIds, showChrome]);

  // Restore scroll position instantly on mount (no animation).
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    window.scrollTo({ top: initialScrollPosition, behavior: "auto" });
  }, [initialScrollPosition]);

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(() => setWelcome(false), 1800);
    return () => clearTimeout(t);
  }, [welcome]);

  const wordsPerChapter = wordCount / Math.max(1, chapterCount);
  const remainingMinutes = Math.max(
    1,
    Math.round(((chapterCount - chapterIndex + 1) * wordsPerChapter) / WORDS_PER_MINUTE)
  );

  function set<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const watermarkRow = `${userEmail}    `.repeat(8);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[1] flex flex-col gap-16 overflow-hidden"
        style={{ inset: "-40% -10%", transform: "rotate(-28deg)" }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="whitespace-nowrap"
            style={{ fontSize: "15px", letterSpacing: "0.3em", color: theme.watermark }}
          >
            {watermarkRow}
          </div>
        ))}
      </div>

      {/* Welcome banner */}
      <div
        className="pointer-events-none fixed left-1/2 top-[18px] z-[90] -translate-x-1/2 transition-all duration-500"
        style={{ opacity: welcome ? 1 : 0, transform: `translateX(-50%) translateY(${welcome ? "0" : "-10px"})` }}
      >
        <div
          className="rounded-full px-[22px] py-2.5 text-sm shadow-[0_12px_30px_-10px_rgba(0,0,0,0.2)]"
          style={{ backgroundColor: theme.panel, border: `1px solid ${theme.border}`, color: theme.text }}
        >
          Welcome back — you left off in Chapter {chapterIndex}
        </div>
      </div>

      {/* Top bar */}
      <div
        className="fixed inset-x-0 top-0 z-[80] backdrop-blur-md transition-all duration-[350ms] ease-out"
        style={{
          backgroundColor: theme.bar,
          borderBottom: `1px solid ${theme.border}`,
          transform: `translateY(${chromeVisible ? "0" : "-100%"})`,
          opacity: chromeVisible ? 1 : 0,
        }}
      >
        <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between px-6">
          <button
            type="button"
            onClick={() => router.push(`/books/${bookSlug}`)}
            className="flex items-center gap-[9px] text-sm"
            style={{ color: theme.faint }}
            aria-label="Back to book page"
          >
            <span className="text-lg">←</span> Back
          </button>
          <div className="truncate text-sm font-medium" style={{ color: theme.text }}>
            {bookTitle}{" "}
            <span style={{ color: theme.faint, fontWeight: 400 }}>
              · Chapter {chapterIndex} of {chapterCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full transition-colors"
            style={{ color: theme.faint }}
            aria-label="Reader settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Reading area */}
      <main
        onContextMenu={(e) => e.preventDefault()}
        className="relative z-[5] mx-auto max-w-[680px] select-none px-7 pb-[200px] pt-32"
      >
        <div className="mb-[54px] text-center">
          <div
            className="mb-[18px] text-[13px] uppercase tracking-[0.22em]"
            style={{ color: theme.faint }}
          >
            Chapter {chapterIndex}
          </div>
          {chapter && (
            <h1
              className="font-[family-name:var(--font-display)] text-[34px] font-medium"
              style={{ color: theme.text }}
            >
              {chapter.title}
            </h1>
          )}
          <div className="mx-auto mt-7 h-px w-10" style={{ backgroundColor: theme.rule }} />
        </div>

        <div
          className="[hyphens:auto]"
          style={{
            fontFamily: settings.fontFamily === "serif" ? "var(--font-eb-garamond)" : "var(--font-inter)",
            fontSize: `${FONT_SIZE_PX[settings.fontSize]}px`,
            lineHeight: LINE_HEIGHT[settings.lineSpacing],
            color: theme.text,
            textAlign: "justify",
            letterSpacing: "0.005em",
          }}
        >
          {loadingChapter && <p style={{ opacity: 0.6 }}>Loading chapter…</p>}
          {!loadingChapter && chapter && renderSimpleMarkdown(chapter.body)}
          {!loadingChapter && !chapter && (
            <p style={{ opacity: 0.6 }}>
              This book&apos;s content isn&apos;t available yet. Please check back soon.
            </p>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-[80] backdrop-blur-md transition-all duration-[350ms] ease-out"
        style={{
          backgroundColor: theme.bar,
          borderTop: `1px solid ${theme.border}`,
          transform: `translateY(${chromeVisible ? "0" : "100%"})`,
          opacity: chromeVisible ? 1 : 0,
        }}
      >
        <div className="h-[3px]" style={{ backgroundColor: theme.track }}>
          <div
            className="h-full transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(scrollProgress * 100)}%`, backgroundColor: theme.accent }}
          />
        </div>
        <div className="mx-auto flex h-[58px] max-w-[1100px] items-center justify-between px-6">
          <button
            type="button"
            onClick={() => goToChapter(-1)}
            disabled={chapterIndex <= 1}
            className="px-1 py-2 text-sm disabled:opacity-30"
            style={{ color: theme.faint }}
            aria-label="Previous chapter"
          >
            ← Previous
          </button>
          <div className="text-[13px]" style={{ color: theme.faint }}>
            Chapter {chapterIndex} / {chapterCount} · ~{remainingMinutes} minutes remaining
          </div>
          <button
            type="button"
            onClick={() => goToChapter(1)}
            disabled={chapterIndex >= chapterCount}
            className="px-1 py-2 text-sm disabled:opacity-30"
            style={{ color: theme.faint }}
            aria-label="Next chapter"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Settings scrim */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[95]"
          style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
          onClick={() => {
            setSettingsOpen(false);
            showChrome();
          }}
        />
      )}

      {/* Settings panel */}
      <aside
        className="fixed bottom-0 right-0 top-0 z-[96] flex w-[340px] max-w-[88vw] flex-col transition-transform duration-[400ms]"
        style={{
          backgroundColor: theme.panel,
          borderLeft: `1px solid ${theme.border}`,
          boxShadow: "-24px 0 60px -20px rgba(0,0,0,0.28)",
          transform: `translateX(${settingsOpen ? "0" : "100%"})`,
          transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          className="flex items-center justify-between px-[26px] py-6"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <span className="font-[family-name:var(--font-display)] text-xl font-medium" style={{ color: theme.text }}>
            Reading settings
          </span>
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              showChrome();
            }}
            className="flex h-8 w-8 items-center justify-center text-xl"
            style={{ color: theme.faint }}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-[30px] px-[26px] py-7">
          <SettingGroup label="Font size" theme={theme}>
            {(["S", "M", "L", "XL"] as const).map((size) => (
              <PillButton
                key={size}
                active={settings.fontSize === size}
                theme={theme}
                style={{ fontSize: `${BUTTON_LABEL_PX[size]}px`, padding: "11px 0" }}
                onClick={() => set("fontSize", size)}
              >
                {size}
              </PillButton>
            ))}
          </SettingGroup>

          <SettingGroup label="Font" theme={theme}>
            <PillButton
              active={settings.fontFamily === "serif"}
              theme={theme}
              style={{ fontFamily: "var(--font-eb-garamond)", fontSize: "15px", padding: "13px 0" }}
              onClick={() => set("fontFamily", "serif")}
            >
              Serif
            </PillButton>
            <PillButton
              active={settings.fontFamily === "sans"}
              theme={theme}
              style={{ fontFamily: "var(--font-inter)", fontSize: "15px", padding: "13px 0" }}
              onClick={() => set("fontFamily", "sans")}
            >
              Sans
            </PillButton>
          </SettingGroup>

          <SettingGroup label="Line spacing" theme={theme}>
            {(["comfortable", "relaxed", "open"] as const).map((spacing) => (
              <PillButton
                key={spacing}
                active={settings.lineSpacing === spacing}
                theme={theme}
                style={{ fontSize: "13px", fontWeight: 500, padding: "11px 0" }}
                onClick={() => set("lineSpacing", spacing)}
              >
                {spacing[0].toUpperCase() + spacing.slice(1)}
              </PillButton>
            ))}
          </SettingGroup>

          <SettingGroup label="Theme" theme={theme}>
            {(
              [
                { key: "light", label: "Light", swatch: "#FAF8F4", swatchBorder: "rgba(0,0,0,0.15)" },
                { key: "sepia", label: "Sepia", swatch: "#F2E8D9", swatchBorder: "rgba(0,0,0,0.12)" },
                { key: "dark", label: "Dark", swatch: "#141414", swatchBorder: "rgba(255,255,255,0.18)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => set("theme", opt.key)}
                className="flex flex-1 flex-col items-center gap-2.5 rounded py-3.5"
                style={{
                  border: `1.5px solid ${settings.theme === opt.key ? theme.accent : theme.border}`,
                }}
              >
                <span
                  className="h-[30px] w-[30px] rounded-full"
                  style={{ backgroundColor: opt.swatch, border: `1px solid ${opt.swatchBorder}` }}
                />
                <span className="text-xs font-medium" style={{ color: theme.text }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </SettingGroup>
        </div>
      </aside>
    </div>
  );
}

function SettingGroup({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-3.5 text-xs font-semibold uppercase tracking-[0.14em]"
        style={{ color: theme.faint }}
      >
        {label}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function PillButton({
  active,
  theme,
  style,
  onClick,
  children,
}: {
  active: boolean;
  theme: ThemeColors;
  style?: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-[3px] font-medium"
      style={{
        ...style,
        backgroundColor: active ? theme.accent : "transparent",
        color: active ? theme.bg : theme.faint,
        border: `1px solid ${active ? theme.accent : theme.border}`,
      }}
    >
      {children}
    </button>
  );
}
