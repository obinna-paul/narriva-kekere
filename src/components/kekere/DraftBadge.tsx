"use client";

import { useEffect, useState } from "react";
import { draftSavedAtStorageKey } from "@/lib/tiptap/save-status";

/**
 * B7.4 — Shows an "Unsaved draft" badge on a story card when localStorage
 * holds a pending draft that hasn't been flushed to the server yet.
 *
 * StoryEditor calls clearLocalBackup() on every successful server save, so
 * if the key is present the content is genuinely unsynced.
 */
export function DraftBadge({ storyId }: { storyId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(draftSavedAtStorageKey(storyId)) !== null);
    } catch {
      // localStorage unavailable (private browsing, permission denied) — hide.
    }
  }, [storyId]);

  if (!show) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8C98C] bg-[#FBEFD9] px-2 py-0.5 text-[11px] font-semibold text-[#C75D2C]">
      <span className="h-[6px] w-[6px] flex-none rounded-full bg-[#C75D2C]" />
      Unsaved draft
    </span>
  );
}
