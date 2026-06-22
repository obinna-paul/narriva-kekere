"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LibraryGrid } from "@/components/kekere/library-grid";
import { cn } from "@/lib/utils/cn";
import type { MockStory } from "@/content/mock/kekere-stories";

const TABS = [
  { id: "saved", label: "Saved" },
  { id: "unlocked", label: "Purchased" },
  { id: "history", label: "History" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface LibraryViewProps {
  savedStories: readonly MockStory[];
  unlockedStories: readonly MockStory[];
}

export function LibraryView({ savedStories, unlockedStories }: LibraryViewProps) {
  const [tab, setTab] = useState<TabId>("saved");

  const tabStories: Record<TabId, readonly MockStory[]> = {
    saved: savedStories,
    unlocked: unlockedStories,
    // No view/read-tracking model exists yet (Story has no per-view log) —
    // unlocks and saves are real, but "reading history" distinct from those
    // isn't trackable until that's built, so this tab is honestly empty
    // rather than faked from unlock data.
    history: [],
  };

  const emptyMessages: Record<TabId, string> = {
    saved: "Nothing saved yet — tap the bookmark on a story to keep it here.",
    unlocked: "You haven't unlocked any stories yet.",
    history: "Reading history isn't tracked yet.",
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
      <h1 className="text-2xl font-bold">Library</h1>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                : "bg-[var(--color-ink)]/[0.06] text-[var(--color-ink)]/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="mt-6"
        >
          <LibraryGrid stories={tabStories[tab]} emptyMessage={emptyMessages[tab]} />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
