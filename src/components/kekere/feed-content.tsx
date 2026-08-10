"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STORY_TAGS } from "@/content/story-tags";
import type { MockStory } from "@/content/mock/kekere-stories";
import type { WinnerStory, FeedTagRow } from "@/app/(kekere)/kekere/feed/page";
import { StoryPreviewSheet } from "@/components/kekere/story-preview-sheet";
import { StorySearch } from "@/components/kekere/story-search";
import { KemiChat } from "@/components/kekere/kemi-chat";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import { LonglistBadge } from "@/components/kekere/LonglistBadge";
import { ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";
import {
  buildGreetingPool,
  pickRandomGreeting,
  renderGreeting,
  getGreetingTimeOfDay,
  GREETING_ROTATION_MS,
  type GreetingPersonalization,
} from "@/content/kekere-feed-greetings";

function thumbnailPattern(seed: string): string {
  const i = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns = [
    "repeating-linear-gradient(45deg,#C75D2C 0 14px,#A84A20 14px 28px)",
    "conic-gradient(from 30deg,#1F4B4B,#2E6A5E,#1F4B4B,#143838,#1F4B4B)",
    "radial-gradient(circle at 30% 30%,#E2A565,#C75D2C 45%,#7A3415)",
    "linear-gradient(135deg,#1F4B4B 0 50%,#E2A565 50% 100%)",
    "conic-gradient(#C75D2C 0 25%,#E2A565 0 50%,#C75D2C 0 75%,#E2A565 0)",
    "repeating-linear-gradient(0deg,#2A1A12 0 7px,#3A2418 7px 14px)",
    "repeating-radial-gradient(circle at 50% 50%,#E2A565 0 9px,#C75D2C 9px 18px)",
  ];
  return patterns[i % patterns.length];
}

/**
 * Shared by every horizontally-scrolling row on the feed. All of them use
 * `px-5` (20px) and `scroll-snap-align: start` cards, and all of them need
 * scroll-padding-left to match that padding.
 *
 * scrollPaddingLeft is what tells the mandatory scroll-snap algorithm where
 * the "start" of the scrollport really is. Without it, padding alone doesn't
 * count for scroll-snap-align purposes — the browser snaps the first card
 * flush against the container's raw edge the moment the row has enough cards
 * to actually overflow, which eats the left gutter and leaves the first cover
 * clipped against the screen edge (confirmed via a live repro: the container's
 * own scrollLeft rested at exactly 20px — its padding-left amount — instead of
 * 0, on load, with no user interaction).
 *
 * This lived inline on StoryRow when it was first diagnosed for "Now
 * trending", which left Winners' Circle and Continue reading with the same
 * bug and no hint that a fix already existed. Hoisted so the three cannot
 * disagree, and so a fourth row gets it by default.
 */
const SNAP_ROW_STYLE: React.CSSProperties = {
  scrollSnapType: "x mandatory",
  scrollPaddingLeft: "20px",
};

function RowCard({
  story,
  badge,
  readProgress,
  onPreview,
}: {
  story: MockStory;
  badge?: string;
  readProgress?: number;
  onPreview: (story: MockStory) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPreview(story)}
      className="block w-[140px] flex-none text-left"
      style={{ scrollSnapAlign: "start" }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-[10px] shadow-[0_8px_20px_-10px_rgba(42,26,18,0.4)] transition-[filter] hover:brightness-[0.92] active:brightness-[0.85]"
        style={{ background: story.coverImageUrl ? undefined : thumbnailPattern(story.id) }}
      >
        {story.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <span className="absolute right-[9px] top-[9px] rounded-[20px] bg-[rgba(42,26,18,0.55)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
          {story.readingTimeMinutes}m
        </span>
        {/* Stacked rather than given its own corner — the reading-time pill,
            the New/Trending badge and the finish rate already hold the other
            three, so a fourth corner chip would collide. */}
        {(story.isAdult || story.isLonglisted) && (
          <span className="absolute left-[9px] top-[9px] flex flex-col items-start gap-1">
            {story.isAdult && <MatureBadge />}
            {story.isLonglisted && <LonglistBadge />}
          </span>
        )}
        {badge && (
          <span className="absolute bottom-[9px] left-[9px] rounded-[20px] bg-[rgba(199,93,44,0.88)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
            {badge}
          </span>
        )}
        {!badge && story.completionRate > 0 && (
          <span className="absolute bottom-[9px] right-[9px] rounded-[20px] bg-[rgba(42,26,18,0.55)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
            {Math.round(story.completionRate)}% finish
          </span>
        )}
        {readProgress != null && readProgress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[rgba(42,26,18,0.2)]">
            <div
              className="h-full rounded-r-full bg-[#C75D2C]"
              style={{ width: `${Math.round(readProgress * 100)}%` }}
            />
          </div>
        )}
      </div>
      <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-base font-semibold leading-[1.2] text-[var(--color-ink)]">
        {story.title}
      </h3>
      <p className="mt-[7px] flex items-center gap-[5px] text-xs text-[var(--color-ink-muted-2)]">
        <span className="flex items-center gap-[3px] font-semibold text-[var(--color-primary)]">
          <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
            <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
            <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
          </svg>
          {story.cowrieCost}
        </span>
        <span>·</span>
        {story.readingTimeMinutes} min
      </p>
    </button>
  );
}

function StoryRow({
  title,
  stories,
  seeMoreHref,
  readingProgress,
  onPreview,
}: {
  title: string;
  stories: readonly MockStory[];
  seeMoreHref?: string;
  readingProgress?: Record<string, number>;
  onPreview: (story: MockStory) => void;
}) {
  if (stories.length === 0) return null;
  const hasMore = stories.length > 8;
  return (
    <section className="py-2">
      <h2 className="px-5 pb-[14px] text-[15px] font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      <div
        className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
        style={SNAP_ROW_STYLE}
      >
        {stories.map((story) => (
          <RowCard key={story.id} story={story} readProgress={readingProgress?.[story.id]} onPreview={onPreview} />
        ))}
        {seeMoreHref && hasMore && (
          <Link
            href={seeMoreHref}
            className="flex w-[60px] flex-none items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
            title="View all stories in this category"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--color-primary)] transition-opacity hover:opacity-60"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}
        <div className="w-[6px] flex-none" />
      </div>
    </section>
  );
}

export interface FeedContentProps {
  trending: readonly MockStory[];
  featuredStory: MockStory | null;
  winnerStories: readonly WinnerStory[];
  inProgressStories: readonly MockStory[];
  recommendedStories: readonly MockStory[];
  signatureRow?: FeedTagRow | null;
  tagRows: readonly FeedTagRow[];
  balance: number;
  isLoggedIn?: boolean;
  /** Reader id + email + referral code — threaded only to the preview
   *  sheet's in-context top-up paywall. Null when logged out. */
  viewerId?: string | null;
  viewerEmail?: string | null;
  referralCode?: string | null;
  readingProgress?: Record<string, number>;
  /** Server-picked (see getFeedGreeting) — the deterministic initial paint,
   * used as-is for the very first render so hydration matches exactly. On
   * mount, a client-side effect re-rolls it at random (see the greeting
   * useEffect below) — replaces the static "Kekere" wordmark. */
  greeting: string;
  /** Needed to scope the "last shown greeting" localStorage key per reader
   * (a shared device shouldn't carry one account's greeting history into
   * another's session). Null when logged out (shouldn't happen — the feed
   * is a protected route — but keeps the type honest). */
  greetingUserId: string | null;
  /** Raw personalization tokens — the actual pool build + random pick
   * happens client-side in the greeting useEffect, not here. */
  greetingPersonalization: GreetingPersonalization;
}

export function FeedContent({
  trending,
  featuredStory,
  winnerStories,
  inProgressStories,
  recommendedStories,
  signatureRow,
  tagRows,
  balance,
  isLoggedIn = false,
  viewerId = null,
  viewerEmail = null,
  referralCode = null,
  readingProgress,
  greeting: initialGreeting,
  greetingUserId,
  greetingPersonalization,
}: FeedContentProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const [previewStory, setPreviewStory] = useState<MockStory | null>(null);
  const [greeting, setGreeting] = useState(initialGreeting);
  const [featuredSaved, setFeaturedSaved] = useState(false);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Editor's Pick has its own explicit "Save for later" button (unlike the
  // rest of the feed, which only saves through the preview sheet), so it
  // needs its own optimistic toggle — same pattern as StoryPreviewSheet's.
  async function toggleFeaturedSave() {
    if (!featuredStory || featuredSaving) return;
    setFeaturedSaving(true);
    try {
      if (featuredSaved) {
        await fetch(`/api/kekere/saved/${featuredStory.id}`, { method: "DELETE" });
        setFeaturedSaved(false);
      } else {
        await fetch("/api/kekere/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: featuredStory.id }),
        });
        setFeaturedSaved(true);
      }
    } finally {
      setFeaturedSaving(false);
    }
  }

  // The browser's own scroll restoration (returning to this tab after being
  // backgrounded, or a soft "back" navigation) can land the feed mid-scroll,
  // which — combined with the sticky greeting/Genre header — reads as if the
  // page opened straight into the Genre row with the greeting never shown.
  // The feed should always open at the top; take manual control of restoration
  // and force it there on every fresh mount of this component.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!tagOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tagOpen]);

  // The greeting holds steady for GREETING_ROTATION_MS (30 min) — reloading
  // the feed, or navigating away and straight back, must NOT change it
  // inside that window. Past the window (or once the time-of-day bucket has
  // flipped, e.g. afternoon → evening), the next visit rolls a fresh line.
  // That's what gives "changes several times a day for an engaged reader,
  // stays put within a session" without the reload-churn the fixed-slot
  // version avoided by going too static. Tracked in localStorage (per
  // reader) so it survives reloads, not just re-renders. Runs client-only
  // (after the server-rendered deterministic `initialGreeting` has already
  // painted) so this can safely touch localStorage and Math.random() without
  // a hydration mismatch.
  useEffect(() => {
    if (!greetingUserId) return;
    const storageKey = `kekere:lastGreeting:${greetingUserId}`;
    const now = Date.now();
    const currentTimeOfDay = getGreetingTimeOfDay();

    let stored: { text: string; timeOfDay: string; ts?: number } | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      // Storage unavailable (private mode, blocked cookies, etc.) — treat
      // as "nothing stored" rather than breaking the greeting.
    }

    const persist = (text: string) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ text, timeOfDay: currentTimeOfDay, ts: now }));
      } catch {
        // Non-fatal — greeting still displays via component state.
      }
    };

    if (
      stored?.text &&
      typeof stored.ts === "number" &&
      now - stored.ts < GREETING_ROTATION_MS &&
      stored.timeOfDay === currentTimeOfDay
    ) {
      // Still inside the rotation window and the same time-of-day — keep
      // showing exactly what was shown, no matter how many times this
      // mounts in the meantime.
      setGreeting(stored.text);
      return;
    }

    if (!stored) {
      // First time ever on this device — adopt the server-rendered greeting
      // as the baseline rather than immediately rerolling over it, so there
      // is no visible flash on a brand-new session. Its rotation clock
      // starts now.
      persist(initialGreeting);
      return;
    }

    // The rotation window has elapsed (or the time-of-day bucket flipped, or
    // this is an older stored entry with no timestamp) — fresh pick, at
    // random, never immediately repeating the last one shown.
    const pool = buildGreetingPool(greetingPersonalization);
    const chosen = pickRandomGreeting(pool, stored.text);
    const text = renderGreeting(chosen, greetingPersonalization);

    setGreeting(text);
    persist(text);
    // Intentionally mount-only: this check belongs on a fresh page load,
    // not on every re-render this component happens to go through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-[calc(80px+env(safe-area-inset-bottom))] text-[var(--color-ink)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[rgba(245,235,221,0.94)] backdrop-blur-[10px]">
        <div className="px-5 pb-3 pt-4">
          <span
            className="line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-[var(--color-primary)]"
            title={greeting}
          >
            {greeting}
          </span>
        </div>

        {/* Genre (still tags under the hood — "Genre" is just the friendlier
            label here), search, Ask Kemi, and the cowrie balance all share
            this row now — moving the balance chip down here (it used to sit
            top-right, next to the greeting) frees the whole row above for
            the greeting text instead of splitting it with a fixed-width
            chip. Kemi sits right beside search — the app's three ways to
            find something to read (browse, search, ask) live together. */}
        <div className="relative flex items-center justify-between gap-2 px-5 pb-[14px] pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <div ref={dropdownRef} className="relative flex-none">
              <button
                type="button"
                onClick={() => setTagOpen(!tagOpen)}
                className="flex cursor-pointer items-center gap-1 rounded-[30px] border border-[rgba(42,26,18,0.14)] bg-white px-4 py-[8px] text-[13.5px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[rgba(42,26,18,0.25)]"
              >
                Genre ▾
              </button>
              {tagOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-[360px] w-[240px] overflow-y-auto rounded-2xl border border-[rgba(42,26,18,0.1)] bg-white p-2 shadow-[0_16px_40px_-14px_rgba(42,26,18,0.35)]">
                  {STORY_TAGS.map((tag) => (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => {
                        setTagOpen(false);
                        router.push(`/kekere/tag/${tag.slug}`);
                      }}
                      className="block w-full rounded-xl px-3 py-[9px] text-left text-[13px] font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[rgba(42,26,18,0.04)] hover:text-[var(--color-ink)]"
                    >
                      {tag.label}
                      <span className="ml-2 text-[11px] text-[var(--color-ink-muted-2)]">
                        — {tag.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <StorySearch onPreview={setPreviewStory} />
            <KemiChat
              readerName={greetingPersonalization.name}
              readerId={greetingUserId}
              topGenre={greetingPersonalization.topGenre}
            />
          </div>
          <Link
            href="/kekere/wallet"
            className="flex flex-none items-center gap-[7px] rounded-[30px] border border-[rgba(42,26,18,0.1)] bg-white px-[14px] py-[7px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
              <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
            </svg>
            <span className="text-[13px] font-semibold text-[var(--color-ink)]">{balance}</span>
          </Link>
        </div>
      </div>

      {/* 1. Winners' Circle */}
      {winnerStories.length > 0 && (
        <section className="py-2">
          <h2 className="px-5 pb-[14px] text-[15px] font-semibold text-[var(--color-ink)]">
            Winners&apos; Circle
          </h2>
          <div
            className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
            style={SNAP_ROW_STYLE}
          >
            {winnerStories.map((story) => (
              <Link
                key={story.id}
                href={`/kekere/story/${story.slug ?? story.id}`}
                className="block w-[140px] flex-none"
                style={{ scrollSnapAlign: "start" }}
              >
                <div
                  className="relative aspect-[3/4] overflow-hidden rounded-[10px] shadow-[0_8px_20px_-10px_rgba(42,26,18,0.4)] transition-[filter] hover:brightness-[0.92]"
                  style={{ background: story.coverImageUrl ? undefined : thumbnailPattern(story.id) }}
                >
                  {story.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={story.coverImageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  {/* Genre and placement badges deliberately omitted here.
                      The section heading already says these are winners, and
                      the cover art is the whole point of this rail — stacking
                      two more chips over it buried the artwork. Placement
                      labelling (winner vs runner-up) is planned as its own
                      treatment later rather than a badge on the cover. The
                      mature-content badge stays: that one is a warning, not
                      decoration. */}
                  {story.isAdult && <MatureBadge className="absolute right-[9px] top-[9px]" />}
                </div>
                <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-base font-semibold leading-[1.2] text-[var(--color-ink)]">
                  {story.title}
                </h3>
                <p className="mt-[7px] flex items-center gap-[5px] text-xs text-[var(--color-ink-muted-2)]">
                  <span className="flex items-center gap-[3px] font-semibold text-[var(--color-primary)]">
                    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
                      <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
                      <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
                    </svg>
                    {story.cowrieCost}
                  </span>
                  <span>·</span>
                  {story.readingTimeMinutes} min
                </p>
                {story.competitionTitle && (
                  <p className="mt-[7px] text-xs font-semibold text-[var(--color-primary)]">
                    {story.competitionTitle}
                  </p>
                )}
              </Link>
            ))}
            <div className="w-[6px] flex-none" />
          </div>
        </section>
      )}

      {/* 2. Editor's Pick — full cover on top at its native 3:4 (no crop),
          text panel below at full card width so a long title just wraps
          instead of fighting for space in a cramped side column. "Editor's
          pick" is a flat label pinned to the cover itself rather than a
          diagonal ribbon or an eyebrow line, and the two actions below are
          square-cornered buttons — a deliberate contrast with the rounded
          pills used everywhere else in the feed, so this card reads as the
          one place a reader can act without leaving the feed. */}
      {featuredStory && (
        <section className="px-5 py-[18px]">
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_18px_40px_-20px_rgba(199,93,44,0.4)] ring-1 ring-[rgba(199,93,44,0.14)]">
            <Link href={`/kekere/story/${featuredStory.slug ?? featuredStory.id}`} className="block">
              <div
                className="relative aspect-[3/4] w-full overflow-hidden"
                style={{ background: featuredStory.coverImageUrl ? undefined : thumbnailPattern(featuredStory.id) }}
              >
                {featuredStory.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredStory.coverImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
                {(featuredStory.isAdult || featuredStory.isLonglisted) && (
                  <span className="absolute right-3 top-3 flex flex-col items-end gap-1">
                    {featuredStory.isAdult && <MatureBadge />}
                    {featuredStory.isLonglisted && <LonglistBadge />}
                  </span>
                )}
                <span className="absolute left-0 top-4 bg-[rgba(199,93,44,0.82)] px-3 py-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-[2px]">
                  Editor&apos;s pick
                </span>
              </div>

              <div className="px-5 pt-5">
                <h3 className="font-[family-name:var(--font-display)] text-[20px] font-semibold leading-[1.25] text-[var(--color-ink)]">
                  {featuredStory.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[14px] italic leading-[1.5] text-[var(--color-ink-muted)]">
                  {featuredStory.hookLine}
                </p>
                <p className="mt-2 text-[12px] font-medium text-[var(--color-ink-muted-2)]">
                  By {featuredStory.authorName}
                </p>
                <p className="mt-3 flex items-center gap-[5px] text-[12.5px] font-medium text-[var(--color-ink-muted-2)]">
                  <span className="flex items-center gap-[3px] font-semibold text-[var(--color-primary)]">
                    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
                      <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
                      <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
                    </svg>
                    {featuredStory.cowrieCost}
                  </span>
                  {" · "}{featuredStory.readingTimeMinutes} min
                  {featuredStory.completionRate > 0 && (
                    <>{" · "}{Math.round(featuredStory.completionRate)}% finish</>
                  )}
                </p>
              </div>
            </Link>

            <div className="flex gap-[10px] px-5 pb-5 pt-4">
              <button
                type="button"
                onClick={toggleFeaturedSave}
                disabled={featuredSaving}
                className="flex flex-1 items-center justify-center gap-[6px] border-2 border-[rgba(42,26,18,0.15)] bg-transparent py-[12px] text-[13.5px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[rgba(42,26,18,0.3)] disabled:opacity-60"
              >
                {featuredSaved ? (
                  <BookmarkCheck size={15} className="text-[var(--color-primary)]" />
                ) : (
                  <Bookmark size={15} />
                )}
                {featuredSaved ? "Saved" : "Save for later"}
              </button>
              <Link
                href={`/kekere/story/${featuredStory.slug ?? featuredStory.id}`}
                className="flex flex-1 items-center justify-center gap-[6px] bg-[var(--color-primary)] py-[12px] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Read now
                <ChevronRight size={15} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Continue Reading (only if user has in-progress stories) */}
      {inProgressStories.length > 0 && (
        <section className="py-2">
          <div className="flex items-center justify-between px-5 pb-[14px]">
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
              Continue reading
            </h2>
          </div>
          <div
            className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
            style={SNAP_ROW_STYLE}
          >
            {inProgressStories.map((story) => (
              <RowCard key={story.id} story={story} badge="Continue" readProgress={readingProgress?.[story.id]} onPreview={setPreviewStory} />
            ))}
            <div className="w-[6px] flex-none" />
          </div>
        </section>
      )}

      {/* 4. Now Trending */}
      <StoryRow title="Now trending" stories={trending} readingProgress={readingProgress} onPreview={setPreviewStory} />

      {/* 5. We think you'll love these (only if recommendations exist) */}
      {recommendedStories.length > 0 && (
        <StoryRow
          title="We think you will love these"
          stories={recommendedStories}
          readingProgress={readingProgress}
          onPreview={setPreviewStory}
        />
      )}

      {/* 6. Signature row (only for a user with a clear top affinity) */}
      {signatureRow && signatureRow.stories.length > 0 && (
        <StoryRow
          title={signatureRow.feedHeading}
          stories={signatureRow.stories}
          seeMoreHref={`/kekere/tag/${signatureRow.slug}`}
          readingProgress={readingProgress}
          onPreview={setPreviewStory}
        />
      )}

      {/* 7. Tag-based rows */}
      {tagRows.map((row) => (
        <StoryRow
          key={row.slug}
          title={row.feedHeading}
          stories={row.stories}
          seeMoreHref={`/kekere/tag/${row.slug}`}
          readingProgress={readingProgress}
          onPreview={setPreviewStory}
        />
      ))}

      {tagRows.length === 0 && trending.length === 0 && (
        <p className="px-5 py-16 text-center text-sm text-[var(--color-ink)]/50">
          Stories are being added soon. Check back shortly.
        </p>
      )}

      <StoryPreviewSheet
        story={previewStory}
        balance={balance}
        isLoggedIn={isLoggedIn}
        viewerId={viewerId}
        viewerEmail={viewerEmail}
        referralCode={referralCode}
        onClose={() => setPreviewStory(null)}
      />
    </div>
  );
}
