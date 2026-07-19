"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bookmark, Share2, MessageCircle, Palette, Check, Copy, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AmbientSoundMenu, type AmbientSoundMenuHandle } from "@/components/kekere/AmbientSoundMenu";
import { StoryReaderContent } from "@/components/kekere/StoryReaderContent";
import { ParagraphCommentIndicators } from "@/components/kekere/ParagraphCommentIndicators";
import { CommentPanel } from "@/components/kekere/CommentPanel";
import { useParagraphComments } from "@/components/kekere/use-paragraph-comments";
import { useParagraphReactions } from "@/components/kekere/use-paragraph-reactions";
import { EmojiFloat } from "@/components/kekere/EmojiFloat";
import { FloatingEmojiPicker } from "@/components/kekere/FloatingEmojiPicker";
import { AuthorChip } from "@/components/kekere/author-chip";
import { FollowButton } from "@/components/kekere/follow-button";
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
  initialUnlocked: boolean;
  initialBalance: number;
  initialSaved: boolean;
  initialRating?: number;
  /** True when this reader hasn't unlocked anything yet and still has their
   * one free first read available — lets this specific story open free
   * regardless of cowrie balance. */
  firstReadFree?: boolean;
  /** Whether the current reader already follows this story's author —
   * omitted entirely (no Follow button shown) when they ARE the author. */
  initialFollowing?: boolean;
  isOwnStory?: boolean;
  /** Server-computed: finished the story, writer accepts notes, no note
   * already sent for this story, and the writer hasn't blocked this reader —
   * see getNoteEligibilityForStory. Safe to compute at page load even though
   * the reader hasn't finished yet: the note prompt only ever renders inside
   * the `finished` overlay below, by which point handleFinish() has already
   * fired. */
  noteEligible?: boolean;
  /** True when this reader already sent a note for this story on an earlier
   * visit (noteEligible is false in that case too, but for a different
   * reason than "can't note this writer at all" — this one still shows a
   * "Note sent" confirmation instead of just showing nothing). */
  noteAlreadySent?: boolean;
  /** The reader's own referral code — the finish overlay's share links carry
   * it (`/kekere/invite/{code}`) so a brand-new signup through the link earns
   * the referrer. Null when logged out (no code, share falls back to the
   * plain story URL). */
  referralCode?: string | null;
}

export function StoryReader({
  story,
  isLoggedIn,
  initialUnlocked,
  initialBalance,
  initialSaved,
  initialRating = 0,
  firstReadFree = false,
  initialFollowing = false,
  isOwnStory = false,
  noteEligible = false,
  noteAlreadySent = false,
  referralCode = null,
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

  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("white");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [contentHidden, setContentHidden] = useState(false);

  // Lightweight anti-piracy deterrent for unlocked (paid) content, in place of
  // the old visible email watermark: blur the story the moment the tab/window
  // loses focus, so a screen recording or an OS app-switcher thumbnail can't
  // capture readable text. A browser has no API to block an actual OS
  // screenshot keypress, so this is a deterrent, not a guarantee — paired with
  // the existing text-selection/copy/context-menu blocks below.
  useEffect(() => {
    if (!unlocked) return;
    function handleVisibility() {
      setContentHidden(document.visibilityState === "hidden");
    }
    function handleBlur() {
      setContentHidden(true);
    }
    function handleFocus() {
      setContentHidden(false);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [unlocked]);

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
  const ambientSoundRef = useRef<AmbientSoundMenuHandle>(null);
  const comments = useParagraphComments(story.id, unlocked);
  const commentCounts = Object.fromEntries(
    Object.entries(comments.commentsByParagraph).map(([id, g]) => [id, g.count])
  );
  const reactions = useParagraphReactions(story.id, unlocked);
  const selectedReaction = comments.selectedParagraphId
    ? reactions.reactionsByParagraph[comments.selectedParagraphId]?.userReaction ?? null
    : null;

  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  // While the ambient-sound dropdown is open, the chrome (which the
  // headphone icon lives in) must not auto-hide out from under it — see
  // showChrome() below and AmbientSoundMenu's onOpenChange.
  const soundMenuOpenRef = useRef(false);
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
    // Don't schedule the auto-hide while the reader has the ambient-sound
    // dropdown open — it should stay up until they close it themselves, not
    // vanish out from under them after a few seconds of not scrolling.
    if (soundMenuOpenRef.current) return;
    hideTimer.current = setTimeout(() => setChromeVisible(false), 3000);
  }, []);

  function handleSoundMenuOpenChange(isOpen: boolean) {
    soundMenuOpenRef.current = isOpen;
    showChrome();
  }

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

  // Prefer the reader's referral invite link so a brand-new signup through
  // the share earns them the referral reward; fall back to the plain story
  // URL when there's no code (logged-out reader).
  const shareUrl = referralCode
    ? `https://narriva.pro/kekere/invite/${referralCode}`
    : `https://narriva.pro/kekere/story/${story.id}`;
  const shareText = `I just read "${story.title}" on Kekere Stories. Check it out: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // noop
    }
  }

  const canAfford = firstReadFree || balance >= story.cowrieCost;
  // story.completionRate is already stored 0-100 (see recalculateCompletionRate) —
  // do not multiply by 100 again here, that produced e.g. "3300%".
  const completionPct = Math.round(story.completionRate);
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
    ambientSoundRef.current?.stop();
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

  async function handleSendNote() {
    setNoteSending(true);
    setNoteError(null);
    try {
      const res = await fetch("/api/kekere/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id, body: noteBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages: Record<string, string> = {
          profanity: "Please remove inappropriate language and try again.",
          too_long: "That's a bit long — keep it under 500 characters.",
          empty: "Write something before sending.",
          already_sent: "You've already sent a note for this story.",
        };
        setNoteError(messages[data.error] ?? "Couldn't send your note — try again.");
        return;
      }
      setNoteSent(true);
    } catch {
      setNoteError("Couldn't send your note — try again.");
    } finally {
      setNoteSending(false);
    }
  }

  if (finished) {
    return (
      <>
      <div
        className="fixed inset-0 z-60 overflow-y-auto transition-colors duration-300 [&_h2]:transition-colors [&_h2]:duration-300 [&_p]:transition-colors [&_p]:duration-300"
        style={{ ...themeVars, backgroundColor: theme.bg, zIndex: 60 }}
      >
      {/* Inner wrapper centres the content when it's short but lets it scroll
          when it's tall (min-h-full + auto centring) — without this the
          overlay clipped its own bottom (Share/Back) on shorter screens. */}
      <div className="flex min-h-full flex-col items-center justify-center px-7 py-10 text-center">
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

        {/* Meet the writer — a self-contained card (photo, name, bio, Follow,
            View profile) so the person behind the story reads as a distinct
            profile rather than loose text floating under the stars. Themed via
            the reader's border/ink vars so it works on white/cream/dark. */}
        <div className="mt-8 w-full max-w-[300px]">
          <h3 className="mb-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted-2)]">
            Meet the writer
          </h3>
          <div
            className="rounded-[16px] border p-[18px]"
            style={{ borderColor: theme.border }}
          >
            <Link href={`/kekere/writer/${story.authorId}`} className="flex flex-col items-center gap-2">
              <div
                className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[22px] font-semibold text-white"
                style={{ background: `linear-gradient(135deg, #E08A4A, ${story.authorAvatarColor ?? "#C75D2C"})` }}
              >
                {story.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  story.authorName.trim().charAt(0).toUpperCase() || "?"
                )}
              </div>
              <p className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[var(--color-ink)]">
                {story.authorName}
              </p>
              {story.authorBio && (
                <p className="line-clamp-3 text-center text-[13px] leading-[1.5] text-[var(--color-ink-muted-2)]">
                  {story.authorBio}
                </p>
              )}
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2.5">
              {!isOwnStory && (
                <FollowButton
                  writerId={story.authorId}
                  isLoggedIn={isLoggedIn}
                  initialFollowing={initialFollowing}
                  variant="full"
                  className="flex-1"
                />
              )}
              <Link
                href={`/kekere/writer/${story.authorId}`}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-full border px-5 py-[10px] text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                  isOwnStory && "flex-1",
                )}
                style={{ borderColor: theme.border }}
              >
                View profile <ArrowUpRight size={15} className="flex-none" />
              </Link>
            </div>
          </div>
        </div>

        {(noteEligible || noteAlreadySent) && (
          <div className="mt-7 w-full max-w-[280px]">
            {noteSent || noteAlreadySent ? (
              <button
                type="button"
                disabled
                className="flex w-full cursor-default items-center justify-center gap-1.5 rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-transparent px-4 py-[13px] text-[15px] font-semibold text-[var(--color-ink-muted-2)]"
              >
                <Check size={16} /> Note sent
              </button>
            ) : noteComposerOpen ? (
              <div className="flex flex-col items-stretch gap-2.5 text-left">
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  maxLength={500}
                  rows={3}
                  autoFocus
                  placeholder={`Tell ${story.authorName} what stuck with you…`}
                  disabled={noteSending}
                  className="w-full resize-none rounded-[10px] border px-3 py-2.5 text-[13.5px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60"
                  style={{ backgroundColor: "transparent", borderColor: theme.border }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[var(--color-ink-muted-3)]">{noteBody.length} / 500</span>
                  <button
                    type="button"
                    onClick={handleSendNote}
                    disabled={noteSending || !noteBody.trim()}
                    className="flex-none cursor-pointer rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {noteSending ? "Sending…" : "Send note"}
                  </button>
                </div>
                {noteError && <p className="text-[12px] text-[#E9A56B]">{noteError}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNoteComposerOpen(true)}
                className="w-full cursor-pointer rounded-[10px] border border-[var(--color-primary)] bg-transparent px-4 py-[13px] text-[15px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-muted)]"
              >
                Send a note to {story.authorName}
              </button>
            )}
          </div>
        )}

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

        {/* Share this story */}
        <div className="mt-8 w-full max-w-[300px]">
          <h3 className="mb-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted-2)]">
            Share this story
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]"
              style={{ borderColor: theme.border }}
            >
              {shareCopied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
          {isLoggedIn && referralCode && (
            <p className="mt-2 text-[11px] leading-[1.45] text-[var(--color-ink-muted-3)]">
              Your invite link is attached — earn 3 cowries when someone new to Kekere joins through it and buys their first cowries.
            </p>
          )}
        </div>

        <Link
          href="/kekere/feed"
          className="mt-8 block w-full max-w-[300px] rounded-[12px] bg-[var(--color-primary)] px-4 py-[15px] text-center text-[15px] font-semibold text-white"
        >
          Back to feed
        </Link>
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
            <AmbientSoundMenu
              ref={ambientSoundRef}
              themeBg={theme.bg}
              themeBorder={theme.border}
              onOpenChange={handleSoundMenuOpenChange}
            />
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
          <div className="mt-[10px] flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <AuthorChip
              authorId={story.authorId}
              authorName={story.authorName}
              avatarColor={story.authorAvatarColor}
              avatarUrl={story.authorAvatarUrl}
              size="md"
            />
            <span className="text-[13.5px] text-[var(--color-ink-muted-2)] transition-colors duration-300">
              · {story.readingTimeMinutes} min read
            </span>
            {!isOwnStory && (
              <FollowButton
                writerId={story.authorId}
                isLoggedIn={isLoggedIn}
                initialFollowing={initialFollowing}
                variant="compact"
              />
            )}
          </div>
        </div>

        <div
          style={{
            userSelect: "none",
            filter: contentHidden ? "blur(24px)" : undefined,
            transition: "filter 150ms ease",
          }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
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
