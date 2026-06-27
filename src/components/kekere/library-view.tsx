"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { MockStory } from "@/content/mock/kekere-stories";

export interface HistoryStory extends MockStory {
  completed: boolean;
  scrollFraction: number;
}

const TABS = [
  { id: "saved", label: "Saved" },
  { id: "unlocked", label: "Unlocked" },
  { id: "history", label: "Reading History" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface LibraryViewProps {
  savedStories: readonly MockStory[];
  unlockedStories: readonly MockStory[];
  historyStories: readonly HistoryStory[];
}

function thumbnailPattern(seed: string): string {
  const i = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns = [
    `radial-gradient(circle at 30% 30%, #E08A4A, #C75D2C 45%, #7A3415)`,
    `conic-gradient(from 30deg, #1F4B4B, #2E6A5E, #1F4B4B, #143838, #1F4B4B)`,
    `conic-gradient(#C75D2C 0 25%, #E08A4A 0 50%, #C75D2C 0 75%, #E08A4A 0)`,
    `repeating-linear-gradient(0deg, #2A1A12 0 6px, #3A2418 6px 12px)`,
    `linear-gradient(135deg, #1F4B4B 0 50%, #E08A4A 50% 100%)`,
  ];
  return patterns[i % patterns.length];
}

function LibraryCard({
  story,
  variant,
  scrollFraction,
}: {
  story: MockStory;
  variant: "saved" | "unlocked" | "history";
  scrollFraction?: number;
}) {
  const cta =
    variant === "saved"
      ? story.isFree
        ? { text: "Saved · Free", color: "text-[#1F6F4A]" }
        : { text: `Saved · ${story.cowrieCost} cowries to unlock`, color: "text-[#8A7565]" }
      : variant === "unlocked"
        ? { text: "Unlocked · Read again", color: "text-[#C75D2C]" }
        : scrollFraction === undefined || scrollFraction >= 1
          ? { text: "Finished", color: "text-[#1F6F4A]" }
          : { text: "Continue reading →", color: "text-[#C75D2C]" };

  return (
    <Link
      href={`/kekere/story/${story.id}`}
      className="flex gap-[14px] rounded-2xl border border-[rgba(42,26,18,0.08)] bg-white p-3 transition-colors hover:border-[var(--color-primary)]"
    >
      <div
        className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-xl"
        style={{ background: thumbnailPattern(story.id) }}
      >
        <span className="absolute bottom-[6px] left-[6px] rounded-[20px] bg-[rgba(31,75,75,0.8)] px-[6px] py-[2px] text-[8px] font-bold text-white">
          {story.genre.toUpperCase()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold leading-[1.18] text-[var(--color-ink)]">
          {story.title}
        </h3>
        <p className="mt-[3px] text-[12.5px] text-[var(--color-ink-muted-2)]">
          {story.authorName}
        </p>

        {variant === "history" && scrollFraction !== undefined && scrollFraction < 1 && (
          <div className="mt-[9px] h-1 overflow-hidden rounded-[2px] bg-[rgba(42,26,18,0.1)]">
            <div
              className="h-full bg-[var(--color-primary)]"
              style={{ width: `${Math.round(scrollFraction * 100)}%` }}
            />
          </div>
        )}

        <p className={cn("mt-2 text-[12.5px] font-semibold", cta.color)}>
          {cta.text}
        </p>
      </div>
    </Link>
  );
}

export function LibraryView({
  savedStories,
  unlockedStories,
  historyStories,
}: LibraryViewProps) {
  const [tab, setTab] = useState<TabId>("saved");

  const tabStories: Record<TabId, readonly MockStory[]> = {
    saved: savedStories,
    unlocked: unlockedStories,
    history: historyStories,
  };

  const emptyMessages: Record<TabId, string> = {
    saved: "Nothing saved yet — tap the bookmark on a story to keep it here.",
    unlocked: "You haven't unlocked any stories yet.",
    history: "No reading history yet. Start reading to see your progress here.",
  };

  return (
    <main className="pb-28">
      <header className="px-[22px] pt-[26px]">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] font-semibold text-[var(--color-ink)]">
          Library
        </h1>
      </header>

      <div className="sticky top-0 z-20 flex gap-2 bg-[rgba(245,235,221,0.95)] px-[22px] pb-3 pt-[10px] backdrop-blur-[10px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "cursor-pointer rounded-[30px] border px-4 py-[9px] text-[13.5px] font-semibold transition-colors",
              tab === t.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-[14px] px-[22px] pt-[18px] pb-[30px]">
        {tabStories[tab].length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--color-ink)]/50">
            {emptyMessages[tab]}
          </p>
        ) : tab === "history" ? (
          (tabStories.history as HistoryStory[]).map((story) => (
            <LibraryCard
              key={story.id}
              story={story}
              variant="history"
              scrollFraction={story.scrollFraction}
            />
          ))
        ) : (
          tabStories[tab].map((story) => (
            <LibraryCard
              key={story.id}
              story={story}
              variant={tab}
            />
          ))
        )}
      </section>
    </main>
  );
}
