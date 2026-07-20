"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { STORY_TAGS } from "@/content/story-tags";
import type { MockStory } from "@/content/mock/kekere-stories";
import type { WinnerStory, FeedTagRow } from "@/app/(kekere)/kekere/feed/page";
import { StoryPreviewSheet } from "@/components/kekere/story-preview-sheet";
import { StorySearch } from "@/components/kekere/story-search";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import {
  buildGreetingPool,
  pickRandomGreeting,
  renderGreeting,
  getGreetingTimeOfDay,
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
          />
        )}
        <span className="absolute right-[9px] top-[9px] rounded-[20px] bg-[rgba(42,26,18,0.55)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
          {story.readingTimeMinutes}m
        </span>
        {story.isAdult && <MatureBadge className="absolute left-[9px] top-[9px]" />}
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
        style={{ scrollSnapType: "x mandatory" }}
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
  firstReadFree?: boolean;
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
  firstReadFree = false,
  readingProgress,
  greeting: initialGreeting,
  greetingUserId,
  greetingPersonalization,
}: FeedContentProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const [previewStory, setPreviewStory] = useState<MockStory | null>(null);
  const [greeting, setGreeting] = useState(initialGreeting);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // The greeting should hold steady for a good stretch — reloading the
  // feed, or navigating away and back, must NOT change it. It only moves on
  // once the time-of-day bucket itself has moved on (morning → afternoon →
  // evening → night, each spanning several hours — see getGreetingTimeOfDay)
  // since the line was last picked, which is what actually gives "a
  // frequent user notices it change 2-3 times a day, a casual user maybe
  // once." Tracked in localStorage (per reader) so it survives reloads, not
  // just re-renders. Runs client-only (after the server-rendered
  // deterministic `initialGreeting` has already painted) so this can safely
  // touch localStorage and Math.random() without a hydration mismatch.
  useEffect(() => {
    if (!greetingUserId) return;
    const storageKey = `kekere:lastGreeting:${greetingUserId}`;
    const currentTimeOfDay = getGreetingTimeOfDay();

    let stored: { text: string; timeOfDay: string } | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      // Storage unavailable (private mode, blocked cookies, etc.) — treat
      // as "nothing stored" rather than breaking the greeting.
    }

    if (stored && stored.timeOfDay === currentTimeOfDay && stored.text) {
      // Still the same time-of-day window as last time it was rolled —
      // keep showing exactly what was shown then, no matter how many times
      // this mounts in the meantime.
      setGreeting(stored.text);
      return;
    }

    if (!stored) {
      // First time ever on this device — adopt the server-rendered greeting
      // as the baseline rather than immediately rerolling over it, so there
      // is no visible flash on a brand-new session.
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ text: initialGreeting, timeOfDay: currentTimeOfDay }));
      } catch {
        // Non-fatal — greeting still displays via the initialGreeting state.
      }
      return;
    }

    // The time-of-day bucket has moved on since the last roll — time for a
    // fresh pick, at random, never immediately repeating the last one shown.
    const pool = buildGreetingPool(greetingPersonalization);
    const chosen = pickRandomGreeting(pool, stored.text);
    const text = renderGreeting(chosen, greetingPersonalization);

    setGreeting(text);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ text, timeOfDay: currentTimeOfDay }));
    } catch {
      // Ignore — same non-fatal storage-unavailable case as above.
    }
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

        {/* Browse by tag dropdown, search, and the cowrie balance all share
            this row now — moving the balance chip down here (it used to sit
            top-right, next to the greeting) frees the whole row above for
            the greeting text instead of splitting it with a fixed-width
            chip. */}
        <div className="relative flex items-center justify-between gap-2 px-5 pb-[14px] pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <div ref={dropdownRef} className="relative flex-none">
              <button
                type="button"
                onClick={() => setTagOpen(!tagOpen)}
                className="flex cursor-pointer items-center gap-1 rounded-[30px] border border-[rgba(42,26,18,0.14)] bg-white px-4 py-[8px] text-[13.5px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[rgba(42,26,18,0.25)]"
              >
                Browse by tag ▾
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
          <h2 className="flex items-center gap-2 px-5 pb-[14px] text-[15px] font-semibold text-[var(--color-ink)]">
            <span aria-hidden="true" className="text-2xl">&#127942;</span>
            Winners&apos; Circle
          </h2>
          <div
            className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {winnerStories.map((story) => (
              <Link
                key={story.id}
                href={`/kekere/story/${story.id}`}
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
                    />
                  )}
                  <span className="absolute left-[9px] top-[9px] rounded-[20px] bg-[rgba(31,75,75,0.78)] px-2 py-[3px] text-[9.5px] font-semibold text-white">
                    {story.genre.toUpperCase()}
                  </span>
                  {story.isAdult && <MatureBadge className="absolute right-[9px] top-[9px]" />}
                  <span
                    className="absolute bottom-[9px] left-[9px] flex items-center gap-1 rounded-[20px] px-[7px] py-[3px] text-[9.5px] font-semibold text-white"
                    style={{
                      background: story.placement === 1 || story.placement === null
                        ? "rgba(199,93,44,0.9)"
                        : "rgba(42,26,18,0.55)",
                    }}
                  >
                    <span aria-hidden="true">
                      {story.placement === 1 || story.placement === null ? "\u{1F3C6}" : "\u{1F3C5}"}
                    </span>
                    {story.placement === 1 ? "Winner" : story.placement === null ? "Champion" : "Runner-up"}
                  </span>
                </div>
                <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-base font-semibold leading-[1.2] text-[var(--color-ink)]">
                  {story.title}
                </h3>
                <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] italic leading-[1.35] text-[var(--color-ink-muted)]">
                  {story.hookLine}
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

      {/* 2. Editor's Pick */}
      {featuredStory && (
        <section className="px-5 py-[18px]">
          <Link
            href={`/kekere/story/${featuredStory.id}`}
            className="relative block h-[220px] overflow-hidden rounded-[18px]"
            style={{ background: "radial-gradient(circle at 70% 20%,#E2A565,#C75D2C 45%,#5A2410)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,26,18,0.9)] to-[rgba(42,26,18,0.1)_60%]" />
            {featuredStory.isAdult && <MatureBadge className="absolute right-4 top-4" />}
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-sand-accent)]">
                EDITOR&apos;S PICK
              </span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-[25px] font-semibold leading-[1.12] text-white">
                {featuredStory.title}
              </h3>
              <p className="mt-[6px] text-[13.5px] italic text-[rgba(255,255,255,0.85)]">
                {featuredStory.hookLine}
              </p>
              <div className="mt-[14px] flex items-center gap-3">
                <span className="rounded-lg bg-[var(--color-sand-accent)] px-[18px] py-[9px] text-[13px] font-semibold text-[#2A1A12]">
                  ▶ Read
                </span>
                <span className="flex items-center gap-[5px] text-[12.5px] text-[rgba(255,255,255,0.8)]">
                  <span className="flex items-center gap-[3px]">
                    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
                      <ellipse cx="12" cy="12" rx="6" ry="9" fill="#E2A565" />
                      <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="rgba(42,26,18,0.4)" strokeWidth="1.1" fill="none" />
                    </svg>
                    {featuredStory.cowrieCost}
                  </span>
                  {" · "}{featuredStory.readingTimeMinutes} min
                  {featuredStory.completionRate > 0 && (
                    <>{" · "}{Math.round(featuredStory.completionRate)}% finish</>
                  )}
                </span>
              </div>
            </div>
          </Link>
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
            style={{ scrollSnapType: "x mandatory" }}
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
        firstReadFree={firstReadFree}
        onClose={() => setPreviewStory(null)}
      />
    </div>
  );
}
