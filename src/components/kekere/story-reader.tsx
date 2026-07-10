"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bookmark, Share2, MessageCircle, Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WatermarkOverlay } from "@/components/kekere/watermark-overlay";
import { StoryReaderContent } from "@/components/kekere/StoryReaderContent";
import { ParagraphCommentIndicators } from "@/components/kekere/ParagraphCommentIndicators";
import { CommentPanel } from "@/components/kekere/CommentPanel";
import { useParagraphComments } from "@/components/kekere/use-paragraph-comments";
import { useParagraphReactions } from "@/components/kekere/use-paragraph-reactions";
import { EmojiFloat } from "@/components/kekere/EmojiFloat";
import { FloatingEmojiPicker } from "@/components/kekere/FloatingEmojiPicker";
import type { MockStory } from "@/content/mock/kekere-stories";

/**
 * Reader background modes. `white` is the default (matches the original
 * `#FCFCFA` reading surface). Each theme overrides the ink CSS variables the
 * reader chrome + body text read from, so switching re-colours everything at
 * once; transitions are applied on the reader root so the change is smooth.
 */
type ReaderTheme = "white" | "cream" | "dark";

const READER_THEME_STORAGE_KEY = "kekere-reader-theme";

const READER_THEMES: Record<
  ReaderTheme,
  {
    label: string;
    bg: string;
    ink: string;
    inkMuted: string;
    inkMuted2: string;
    inkMuted3: string;
    headerBg: string;
    border: string;
    track: string;
    swatch: string;
    swatchRing: string;
  }
> = {
  white: {
    label: "White",
    bg: "#FCFCFA",
    ink: "#2A1A12",
    inkMuted: "#6A5446",
    inkMuted2: "#8A7565",
    inkMuted3: "#A08C7C",
    headerBg: "rgba(252,252,250,0.95)",
    border: "rgba(42,26,18,0.08)",
    track: "rgba(42,26,18,0.08)",
    swatch: "#FCFCFA",
    swatchRing: "rgba(42,26,18,0.18)",
  },
  cream: {
    label: "Cream",
    bg: "#F5EBDD",
    ink: "#2A1A12",
    inkMuted: "#6A5446",
    inkMuted2: "#8A7565",
    inkMuted3: "#A08C7C",
    headerBg: "rgba(245,235,221,0.95)",
    border: "rgba(42,26,18,0.08)",
    track: "rgba(42,26,18,0.08)",
    swatch: "#F0E2CC",
    swatchRing: "rgba(42,26,18,0.18)",
  },
  dark: {
    label: "Dark",
    bg: "#181510",
    ink: "#EDE6DA",
    inkMuted: "#B8AE9E",
    inkMuted2: "#9A9082",
    inkMuted3: "#7C7366",
    headerBg: "rgba(24,21,16,0.95)",
    border: "rgba(237,230,218,0.12)",
    track: "rgba(237,230,218,0.14)",
    swatch: "#181510",
    swatchRing: "rgba(237,230,218,0.3)",
  },
};

const READER_THEME_ORDER: ReaderTheme[] = ["white", "cream", "dark"];

export interface StoryReaderProps {
  story: MockStory;
  isLoggedIn: boolean;
  userEmail?: string;
  initialUnlocked: boolean;
  initialBalance: number;
  initialSaved: boolean;
  initialRating?: number;
  /** True when this reader hasn't unlocked anything yet and still has their
   * one free first read available — lets this specific story open free
   * regardless of cowrie balance. */
  firstReadFree?: boolean;
}

export function StoryReader({
  story,
  isLoggedIn,
  userEmail,
  initialUnlocked,
  initialBalance,
  initialSaved,
  initialRating = 0,
  firstReadFree = false,
}: StoryReaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, startRefresh] = useTransition();

  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [balance, setBalance] = useState(initialBalance);
  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tipping, setTipping] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [showNoCowryModal, setShowNoCowryModal] = useState(false);

  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("white");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Load the saved reader theme after mount (keeps SSR/first paint on the
  // default `white` so hydration matches, then upgrades to the reader's pick).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(READER_THEME_STORAGE_KEY);
      if (saved === "white" || saved === "cream" || saved === "dark") {
        setReaderTheme(saved);
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(READER_THEME_STORAGE_KEY, readerTheme);
    } catch {
      // ignore unavailable storage
    }
  }, [readerTheme]);

  const theme = READER_THEMES[readerTheme];
  const themeVars = {
    "--color-ink": theme.ink,
    "--color-ink-muted": theme.inkMuted,
    "--color-ink-muted-2": theme.inkMuted2,
    "--color-ink-muted-3": theme.inkMuted3,
  } as CSSProperties;

  // Once a successful unlock triggers router.refresh(), this fires when the
  // server's refetched props (now carrying the real, untruncated body) land
  // — syncing local state to match, rather than the handler optimistically
  // flipping `unlocked` itself using the still-truncated `story` prop that
  // was fetched while the story was locked.
  useEffect(() => {
    setUnlocked(initialUnlocked);
  }, [initialUnlocked]);

  const contentRef = useRef<HTMLDivElement>(null);
  const comments = useParagraphComments(story.id, unlocked);
  const commentCounts = Object.fromEntries(
    Object.entries(comments.commentsByParagraph).map(([id, g]) => [id, g.count])
  );
  const reactions = useParagraphReactions(story.id, unlocked);
  const selectedReaction = comments.selectedParagraphId
    ? reactions.reactionsByParagraph[comments.selectedParagraphId]?.userReaction ?? null
    : null;

  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastProgressSaved = useRef(0);
  const pendingFrac = useRef<number | null>(null);

  const flushProgress = useCallback(() => {
    if (pendingFrac.current === null) return;
    const frac = pendingFrac.current;
    pendingFrac.current = null;
    clearTimeout(progressTimer.current);
    const body = JSON.stringify({ scrollFraction: frac });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        `/api/kekere/stories/${story.id}/progress`,
        new Blob([body], { type: "application/json" }),
      );
    } else {
      fetch(`/api/kekere/stories/${story.id}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, [story.id]);

  const saveProgress = useCallback(
    (frac: number) => {
      if (!isLoggedIn || frac <= lastProgressSaved.current + 0.05) return;
      lastProgressSaved.current = frac;
      pendingFrac.current = frac;
      clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        pendingFrac.current = null;
        fetch(`/api/kekere/stories/${story.id}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scrollFraction: frac }),
        }).catch(() => {});
      }, 5000);
    },
    [isLoggedIn, story.id],
  );

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 3000);
  }, []);

  useEffect(() => {
    showChrome();

    function onScroll() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const frac = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      setProgress(frac);
      saveProgress(frac);
      showChrome();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", showChrome, { passive: true });
    window.addEventListener("touchstart", showChrome, { passive: true });
    window.addEventListener("beforeunload", flushProgress);

    return () => {
      clearTimeout(hideTimer.current);
      flushProgress();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", showChrome);
      window.removeEventListener("touchstart", showChrome);
      window.removeEventListener("beforeunload", flushProgress);
    };
  }, [showChrome, saveProgress, flushProgress]);

  function requireLogin() {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  async function handleUnlock() {
    if (!isLoggedIn) return requireLogin();
    setUnlocking(true);
    setUnlockError(null);

    const res = await fetch(`/api/kekere/stories/${story.id}/unlock`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.error === "insufficient_balance") {
        setBalance(data.balance);
        setUnlockError(data.message);
      } else {
        setUnlockError("Something went wrong unlocking this story. Try again.");
      }
      setUnlocking(false);
      return;
    }

    setBalance(data.balance);
    // Don't flip `unlocked` here — `story.bodyDoc` in this render is still
    // the truncated preview fetched while the story was locked. Refresh so
    // the server sends the real body, and let the effect above flip
    // `unlocked` once those fresh props actually arrive. isRefreshing keeps
    // the button showing "Unlocking…" for the whole wait, not just the fetch.
    startRefresh(() => {
      router.refresh();
    });
    setUnlocking(false);
  }

  async function toggleSave() {
    if (!isLoggedIn) return requireLogin();
    setSavePending(true);
    const nextSaved = !saved;
    setSaved(nextSaved);

    const res = nextSaved
      ? await fetch("/api/kekere/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: story.id }),
        })
      : await fetch(`/api/kekere/saved/${story.id}`, { method: "DELETE" });

    setSavePending(false);
    if (!res.ok) setSaved(!nextSaved);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // noop
    }
  }

  const canAfford = firstReadFree || balance >= story.cowrieCost;
  const completionPct = Math.round(story.completionRate * 100);
  const progressPct = Math.round(progress * 100);

  function handleRate(n: number) {
    setRating(n);
    if (isLoggedIn) {
      fetch(`/api/kekere/stories/${story.id}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: n }),
      }).catch(() => {});
    }
  }

  function handleFinish() {
    setFinished(true);
    if (isLoggedIn) {
      fetch(`/api/kekere/stories/${story.id}/complete`, { method: "POST" }).catch(() => {});
    }
  }

  async function handleTip() {
    if (!isLoggedIn) return requireLogin();
    setTipping(true);
    setTipError(null);

    const res = await fetch(`/api/kekere/stories/${story.id}/tip`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setTipError(data.error ?? "Couldn't tip right now.");
      setTipping(false);
      return;
    }

    setBalance(data.balance);
    setTipping(false);
    setTipped(true);
  }

  if (finished) {
    return (
      <>
      <div
        className="fixed inset-0 z-60 flex flex-col items-center justify-center px-7 py-10 text-center transition-colors duration-300 [&_h2]:transition-colors [&_h2]:duration-300 [&_p]:transition-colors [&_p]:duration-300"
        style={{ ...themeVars, backgroundColor: theme.bg, zIndex: 60 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          You finished
        </p>
        <h2 className="mt-4 max-w-[320px] font-[family-name:var(--font-display)] text-[30px] font-semibold leading-[1.16] text-[var(--color-ink)]">
          {story.title}
        </h2>
        <p className="mt-[18px] text-sm text-[var(--color-ink-muted-2)]">How was it?</p>

        <div className="mt-[14px] flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
              onClick={() => handleRate(n)}
              className="cursor-pointer bg-none text-[34px] leading-none"
              style={{ color: n <= rating ? "#C75D2C" : "rgba(42,26,18,0.18)" }}
            >
              ★
            </button>
          ))}
        </div>

        {isLoggedIn && (
          <div className="mt-7 flex w-full max-w-[280px] flex-col items-center gap-3">
            {tipped ? (
              <p className="text-sm text-[var(--color-success)]">Tipped 1 cowry. Thank you!</p>
            ) : balance >= 1 ? (
              <button
                type="button"
                disabled={tipping}
                onClick={handleTip}
                className="w-full cursor-pointer rounded-[10px] border border-[var(--color-primary)] bg-transparent px-4 py-[13px] text-[15px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-muted)] disabled:opacity-50"
              >
                {tipping ? "Tipping…" : "Tip 1 cowry"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNoCowryModal(true)}
                className="w-full cursor-pointer rounded-[10px] border border-dashed border-[rgba(42,26,18,0.2)] bg-transparent px-4 py-[13px] text-[15px] font-semibold text-[var(--color-ink-muted-2)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Tip 1 cowry
              </button>
            )}
            <p className="text-[11px] text-[var(--color-ink-muted-3)]">
              All tips go straight to the writer
            </p>
            {tipError && (
              <p className="text-sm text-[#A13A3A]">{tipError}</p>
            )}
          </div>
        )}

        <div className="mt-9 flex w-full max-w-[280px] flex-col gap-3">
          <Link
            href="/kekere/feed"
            className="block rounded-[10px] bg-[var(--color-primary)] px-4 py-[15px] text-center text-[15px] font-semibold text-white"
          >
            Back to feed
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-transparent px-4 py-[15px] text-[15px] font-semibold text-[var(--color-ink)]"
          >
            Share this story
          </button>
        </div>
      </div>

      {showNoCowryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(42,26,18,0.5)] px-6">
          <div className="w-full max-w-[340px] rounded-[20px] bg-white p-[26px] text-center shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)]">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">Oops!</h3>
            <p className="mt-3 text-sm leading-[1.55] text-[var(--color-ink-muted)]">
              Looks like you don&apos;t have any cowries yet. But don&apos;t worry, you can earn some cowries.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNoCowryModal(false)}
                className="flex-1 cursor-pointer rounded-[10px] border border-[rgba(42,26,18,0.14)] bg-transparent px-4 py-[12px] text-sm font-semibold text-[var(--color-ink-muted)]"
              >
                Back to story
              </button>
              <Link
                href="/kekere/wallet"
                className="flex-1 rounded-[10px] bg-[var(--color-primary)] px-4 py-[12px] text-center text-sm font-semibold text-white"
              >
                Earn cowries
              </Link>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div
      className="relative min-h-screen transition-colors duration-300"
      style={{ ...themeVars, backgroundColor: theme.bg }}
    >
      {isLoggedIn && userEmail && (
        <WatermarkOverlay email={userEmail} opacity={0.06} />
      )}

      <div className="fixed inset-x-0 top-0 z-50 h-[3px] transition-colors duration-300" style={{ backgroundColor: theme.track }}>
        <div
          className="h-full bg-[var(--color-primary)] transition-[width] duration-150 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-[3px] z-45 border-b backdrop-blur-[10px] transition-[transform,opacity,background-color,border-color] duration-[350ms]",
          chromeVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
        style={{ zIndex: 45, backgroundColor: theme.headerBg, borderBottomColor: theme.border }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/kekere/feed"
            aria-label="Back to feed"
            className="flex-none text-xl text-[var(--color-ink-muted)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--color-ink)]">
            {story.title}
          </div>
          <div className="flex flex-none items-center gap-[14px]">
            <div className="relative flex items-center">
              <button
                type="button"
                aria-label="Reading background"
                aria-haspopup="true"
                aria-expanded={themeMenuOpen}
                onClick={() => setThemeMenuOpen((v) => !v)}
                className="bg-none text-[17px] transition-colors hover:text-[var(--color-primary)]"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: themeMenuOpen ? "var(--color-primary)" : "var(--color-ink-muted)",
                }}
              >
                <Palette className="h-[17px] w-[17px]" />
              </button>

              {themeMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close background menu"
                    tabIndex={-1}
                    onClick={() => setThemeMenuOpen(false)}
                    className="fixed inset-0 z-[55] cursor-default"
                    style={{ background: "transparent", border: "none" }}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+12px)] z-[56] w-[172px] animate-scale-in rounded-[12px] border p-2 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.45)]"
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  >
                    <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-3)]">
                      Background
                    </p>
                    {READER_THEME_ORDER.map((key) => {
                      const opt = READER_THEMES[key];
                      const active = key === readerTheme;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setReaderTheme(key);
                            setThemeMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-[10px] rounded-[8px] px-2 py-[9px] text-left text-[13.5px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          <span
                            className="inline-block h-[18px] w-[18px] flex-none rounded-full"
                            style={{ backgroundColor: opt.swatch, boxShadow: `inset 0 0 0 1px ${opt.swatchRing}` }}
                          />
                          <span className="flex-1">{opt.label}</span>
                          {active && <Check className="h-[15px] w-[15px] flex-none text-[var(--color-primary)]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {unlocked && (
              <button
                type="button"
                aria-label={comments.panelOpen ? "Close comments" : "Open comments"}
                aria-pressed={comments.panelOpen}
                onClick={() => comments.setPanelOpen((v) => !v)}
                className="bg-none text-[17px] transition-colors hover:text-[var(--color-primary)]"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: comments.panelOpen ? "var(--color-primary)" : "var(--color-ink-muted)",
                }}
              >
                <MessageCircle className="h-[17px] w-[17px]" />
              </button>
            )}
            <button
              type="button"
              aria-label={saved ? "Remove bookmark" : "Bookmark"}
              aria-pressed={saved}
              disabled={savePending}
              onClick={toggleSave}
              className="bg-none text-[17px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Bookmark className="h-[17px] w-[17px]" fill={saved ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              aria-label={shareCopied ? "Link copied" : "Share"}
              onClick={handleShare}
              className="bg-none text-base text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={cn(comments.panelOpen && unlocked && "md:flex md:items-start md:justify-center md:gap-6")}>
      <main
        className={cn(
          "relative z-[5] mx-auto max-w-[680px] px-8 pb-24",
          comments.panelOpen && unlocked && "md:mx-0"
        )}
        style={{ paddingTop: 78 }}
      >
        <div className="mb-[30px]">
          <span className="inline-block rounded-[20px] bg-[var(--color-accent)] px-[11px] py-1 text-[11px] font-semibold text-white">
            {story.genre.toUpperCase()}
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.12] text-[var(--color-ink)] transition-colors duration-300">
            {story.title}
          </h1>
          <p className="mt-[10px] text-[13.5px] text-[var(--color-ink-muted-2)] transition-colors duration-300">
            by {story.authorName} · {story.readingTimeMinutes} min read
          </p>
        </div>

        <div
          style={{ userSelect: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {unlocked ? (
            <div className="flex flex-col">
              <div ref={contentRef} className="relative">
                {story.bodyDoc && <StoryReaderContent doc={story.bodyDoc} />}
                <ParagraphCommentIndicators
                  containerRef={contentRef}
                  commentCounts={commentCounts}
                  selectedParagraphId={comments.selectedParagraphId}
                  panelOpen={comments.panelOpen}
                  onSelectParagraph={comments.selectParagraph}
                  onOpenComments={comments.openComments}
                />
                <EmojiFloat containerRef={contentRef} reactionsByParagraph={reactions.reactionsByParagraph} />
              </div>

              {comments.selectedParagraphId && !comments.panelOpen && (
                <FloatingEmojiPicker
                  containerRef={contentRef}
                  paragraphId={comments.selectedParagraphId}
                  userReaction={selectedReaction}
                  onSelect={(emoji) => reactions.setReaction(comments.selectedParagraphId!, emoji)}
                  onRemove={() => reactions.removeReaction(comments.selectedParagraphId!)}
                  onDismiss={comments.deselect}
                />
              )}

              <div className="pt-[30px] text-center">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="cursor-pointer rounded-[30px] border border-[rgba(42,26,18,0.16)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  I finished this
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative pt-2 text-center">
                <h2 className="mb-[6px] font-[family-name:var(--font-display)] text-[21px] font-semibold text-[var(--color-ink)]">
                  Keep reading?
                </h2>
                {completionPct > 0 && (
                  <p className="mb-5 text-[13.5px] text-[var(--color-ink-muted-2)]">
                    {completionPct}% of readers who start this one finish it.
                  </p>
                )}

                <div className="mx-auto max-w-[360px] rounded-2xl border border-[rgba(42,26,18,0.1)] bg-white p-6 text-center shadow-[0_16px_40px_-18px_rgba(42,26,18,0.3)]">
                  {firstReadFree ? (
                    <p className="mb-4 rounded-lg bg-[rgba(199,93,44,0.08)] px-3 py-2 text-[13px] font-semibold text-[var(--color-primary)]">
                      Your first story is free — no cowries needed
                    </p>
                  ) : (
                    <div className="mb-4 flex items-center justify-center gap-2 text-[13px] text-[var(--color-ink-muted)]">
                      <span>Your balance</span>
                      <span className="inline-flex items-center gap-[5px] font-semibold text-[var(--color-ink)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                          <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
                          <path d="M12 5 Q13.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
                        </svg>
                        {balance}
                      </span>
                    </div>
                  )}

                  {canAfford ? (
                    <button
                      type="button"
                      disabled={unlocking || isRefreshing}
                      onClick={handleUnlock}
                      className="w-full cursor-pointer rounded-[10px] bg-[var(--color-primary)] px-4 py-4 text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
                      style={{ border: "none" }}
                    >
                      {unlocking || isRefreshing
                        ? "Unlocking…"
                        : firstReadFree
                          ? "Read free"
                          : `Unlock for ${story.cowrieCost} cowries`}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        disabled
                        className="w-full cursor-not-allowed rounded-[10px] bg-[var(--color-ink)]/[0.12] px-4 py-4 text-base font-semibold text-[var(--color-ink-muted-2)]"
                        style={{ border: "none" }}
                      >
                        Unlock for {story.cowrieCost} cowries
                      </button>
                      <Link
                        href="/kekere/wallet"
                        className="block rounded-[10px] bg-[var(--color-primary)] px-4 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
                      >
                        Top up
                      </Link>
                    </div>
                  )}

                  {unlockError && (
                    <p className="mt-3 text-sm text-red-600">{unlockError}</p>
                  )}

                  <p className="mt-3 text-xs text-[var(--color-ink-muted-3)]">
                    Every unlock supports the writer directly.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {unlocked && (
        <CommentPanel
          open={comments.panelOpen}
          onClose={() => comments.setPanelOpen(false)}
          selectedParagraphId={comments.selectedParagraphId}
          comments={comments.selectedGroup?.comments}
          unlocked={unlocked}
          posting={comments.posting}
          error={comments.error}
          onPost={comments.postComment}
          pendingNewCount={comments.pendingNewCount}
          onApplyPending={comments.applyPending}
          userReaction={selectedReaction}
          onSelectEmoji={(emoji) => reactions.setReaction(comments.selectedParagraphId!, emoji)}
          onRemoveEmoji={() => reactions.removeReaction(comments.selectedParagraphId!)}
        />
      )}

      </div>
    </div>
  );
}
