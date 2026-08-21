"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { TAG_BY_SLUG } from "@/content/story-tags";
import { TagPreferencePicker } from "@/components/kekere/tag-preference-picker";

export interface PreferencesViewProps {
  initialExplicit: string[];
  initialAutoDetected: string[];
}

function tagLabel(slug: string): string {
  return TAG_BY_SLUG[slug]?.label ?? slug;
}

export function PreferencesView({ initialExplicit, initialAutoDetected }: PreferencesViewProps) {
  // "Kemi's belief" about the reader's taste, single-sourced: once they've
  // corrected her by saving explicit picks, that correction IS what she
  // thinks — auto-detection only speaks for her before she's ever been
  // corrected. Both the summary card and the picker's pre-fill read from
  // this same list, so editing really is editing her memory, not a
  // separate, parallel "your real preferences" record that can drift from
  // what the summary claims she believes.
  const kemiBelief = initialExplicit.length > 0 ? initialExplicit : initialAutoDetected;

  // Summary mode ("Kemi thinks you prefer...") is always the entry point,
  // even for a reader who's already saved explicit preferences — it's
  // Kemi's current belief, not a one-time cold-start prompt, so it stays
  // the front door on every visit. Editing is only reachable by clicking
  // through. The one exception: with no belief at all yet (never read
  // anything, never saved anything), there's nothing for the summary to
  // say, so a reader lands straight in the picker.
  const [mode, setMode] = useState<"summary" | "picker">(kemiBelief.length > 0 ? "summary" : "picker");
  const [selected, setSelected] = useState<string[]>(kemiBelief);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/kekere/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagSlugs: selected }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setMode("picker");
    }
  }

  return (
    <div className="px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="mb-[26px] flex items-center gap-3">
        <Link
          href="/kekere/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[var(--color-ink)]/[0.06]"
          aria-label="Back to profile"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          Preferences
        </span>
      </div>

      {mode === "summary" ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="p-4">
            <div className="mb-3 text-[var(--color-primary)]">
              <span className="text-[13px] font-semibold">Kemi thinks you prefer stories with these tags.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {kemiBelief.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-[7px] text-[13px] font-medium text-[var(--color-ink)]"
                >
                  {tagLabel(slug)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode("picker")}
            className="flex w-full items-center gap-3 border-t border-[var(--color-border)] px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-ink)]/[0.02] active:bg-[var(--color-ink)]/[0.04]"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[rgba(199,93,44,0.1)] text-[var(--color-primary)]">
              <PenLine size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[var(--color-ink)]">Did she get it wrong?</span>
              <span className="block text-[12px] text-[var(--color-ink-muted-2)]">Tell her what you actually prefer</span>
            </span>
            <ChevronRight size={16} className="flex-none text-[var(--color-ink-muted-3)]" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-[13px] text-[var(--color-ink-muted-2)]">
            Pick the kinds of stories you love. We&apos;ll bring those categories higher up your feed — the ones you
            skip stay lower.
          </p>

          <TagPreferencePicker value={selected} onChange={setSelected} />

          <div className="sticky bottom-[calc(16px+env(safe-area-inset-bottom))] flex flex-col gap-2">
            {saved && (
              <p className="text-center text-[12.5px] font-semibold text-[var(--color-accent)]">
                Preferences saved.
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-[14px] bg-[var(--color-primary)] py-[14px] text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(199,93,44,0.5)] transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
