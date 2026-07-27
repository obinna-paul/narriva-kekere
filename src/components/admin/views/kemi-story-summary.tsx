"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StorySummary {
  synopsis: string;
  beats: string[];
  ending: string | null;
  contentFlags: string[];
  looseEnds: string[];
  gaps: string[];
  truncated: boolean;
}

/**
 * Kemi reading a submission on the editor's behalf.
 *
 * A summary of a story nobody has committed to publishing is worth exactly
 * as much as it is accurate, and it costs a Groq call shared with the
 * reader-facing Kemi, so nothing happens until the editor asks. Once asked,
 * the answer is memoised for the rest of the session: an editor moving back
 * and forth across a queue shouldn't pay for the same read twice.
 *
 * Only rendered in the Story Review tab. Once a story reaches To Be
 * Published the editor has already read it — they decided to publish it —
 * and the story is being actively edited there, which would make a cached
 * summary quietly wrong.
 */
const summaryCache = new Map<string, StorySummary>();

export function KemiStorySummary({ storyId }: { storyId: string }) {
  const [summary, setSummary] = useState<StorySummary | null>(() => summaryCache.get(storyId) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${storyId}/summarise`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Kemi couldn't read this one right now.");
        return;
      }
      summaryCache.set(storyId, data);
      setSummary(data);
      setOpen(true);
    } catch {
      setError("Kemi couldn't read this one right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-[11px] border border-dashed border-[rgba(199,93,44,0.35)] bg-[rgba(199,93,44,0.03)] px-4 py-3">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-[7px] bg-[#C75D2C] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Sparkles size={11} />
          {loading ? "Kemi is reading…" : "Ask Kemi to read it first"}
        </button>
        <p className="text-[11px] leading-[1.5] text-[#8B919A]">
          {error ?? "She'll tell you the plot, the ending and anything you'd want flagged — so you know what you're opening."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-[11px] border border-[rgba(199,93,44,0.25)] bg-[rgba(199,93,44,0.035)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Sparkles size={12} className="flex-none text-[#C75D2C]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C75D2C]">Kemi&rsquo;s read</span>
        {summary.contentFlags.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[rgba(192,57,43,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#C0392B]">
            <AlertTriangle size={9} />
            {summary.contentFlags.length} flag{summary.contentFlags.length === 1 ? "" : "s"}
          </span>
        )}
        <div className="flex-1" />
        <ChevronDown size={13} className={cn("flex-none text-[#C75D2C] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-[13px] leading-[1.6] text-[#3A3F46]">{summary.synopsis}</p>

          {summary.beats.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {/* Numbered because the order is the plot — these are the story's
                  events in sequence, not an unordered list of observations. */}
              {summary.beats.map((beat, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] leading-[1.5] text-[#646B73]">
                  <span className="w-4 flex-none text-right font-semibold tabular-nums text-[#B4844F]">{i + 1}</span>
                  <span>{beat}</span>
                </li>
              ))}
            </ol>
          )}

          {summary.ending && (
            <div className="border-l-2 border-[#C75D2C] pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Where it lands</p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[#3A3F46]">{summary.ending}</p>
            </div>
          )}

          {summary.contentFlags.length > 0 && (
            <div className="rounded-[8px] border border-[rgba(192,57,43,0.2)] bg-[rgba(192,57,43,0.05)] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#C0392B]">On the page</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {summary.contentFlags.map((flag, i) => (
                  <li key={i} className="text-[12px] leading-[1.5] text-[#C0392B]">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.looseEnds.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Threads left hanging</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {summary.looseEnds.map((item, i) => (
                  <li key={i} className="text-[12px] leading-[1.5] text-[#646B73]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.gaps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B7791F]">Kemi couldn&rsquo;t tell</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {summary.gaps.map((item, i) => (
                  <li key={i} className="text-[12px] leading-[1.5] text-[#B7791F]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-[rgba(199,93,44,0.15)] pt-2.5">
            <p className="flex-1 text-[10px] leading-[1.5] text-[#9AA0A8]">
              {summary.truncated
                ? "This story was too long to send whole — Kemi saw the opening, a slice of the middle and the ending. Treat it as a way in, not a substitute for reading it."
                : "Kemi's read of the story, not a verdict on it. She can be confidently wrong; the decision is still yours."}
            </p>
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="flex-none rounded-[7px] border border-[rgba(199,93,44,0.3)] px-2.5 py-1 text-[10px] font-semibold text-[#C75D2C] transition-colors hover:bg-[rgba(199,93,44,0.08)] disabled:opacity-50"
            >
              {loading ? "Reading…" : "Read again"}
            </button>
          </div>

          {error && <p className="text-[11px] text-[#C0392B]">{error}</p>}
        </div>
      )}
    </div>
  );
}
