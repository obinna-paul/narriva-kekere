"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Clock, CheckCircle2, AlertCircle, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StoryStatus } from "@prisma/client";

// Dates arrive as ISO strings over the wire (JSON serialization)
interface AuthorStorySummary {
  id: string;
  title: string;
  hookLine: string | null;
  status: StoryStatus;
  wordCount: number;
  updatedAt: string;
  lastSavedAt: string | null;
}

const READING_WPM = 200;

const STATUS_LABEL: Record<StoryStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Needs revisions",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
  PENDING_CONTRACT: "Contract pending",
};

const STATUS_COLORS: Record<StoryStatus, { bg: string; text: string }> = {
  DRAFT:                 { bg: "bg-[rgba(42,26,18,.07)]",       text: "text-[rgba(42,26,18,.6)]" },
  SUBMITTED:             { bg: "bg-[rgba(31,75,75,.1)]",        text: "text-[#1F4B4B]" },
  REVIEWING:             { bg: "bg-[rgba(31,75,75,.1)]",        text: "text-[#1F4B4B]" },
  REVISIONS_REQUESTED:   { bg: "bg-[rgba(199,93,44,.1)]",       text: "text-[#C75D2C]" },
  PUBLISHED:             { bg: "bg-[rgba(31,111,74,.1)]",       text: "text-[#1F6F4A]" },
  REJECTED:              { bg: "bg-[rgba(179,55,29,.1)]",       text: "text-[#B3371D]" },
  PENDING_CONTRACT:      { bg: "bg-[rgba(130,80,190,.1)]",      text: "text-[#6C3BAA]" },
};

const STATUS_ICON: Record<StoryStatus, ReactNode> = {
  DRAFT:               <FileText size={13} />,
  SUBMITTED:           <Clock size={13} />,
  REVIEWING:           <Eye size={13} />,
  REVISIONS_REQUESTED: <AlertCircle size={13} />,
  PUBLISHED:           <CheckCircle2 size={13} />,
  REJECTED:            <AlertCircle size={13} />,
  PENDING_CONTRACT:    <FileText size={13} />,
};

const EDITABLE: StoryStatus[] = ["DRAFT", "REVISIONS_REQUESTED"];

function relTime(date: string): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function readingTime(wordCount: number): string {
  const mins = Math.max(1, Math.round(wordCount / READING_WPM));
  return `~${mins} min read`;
}

interface Props {
  competitionSlug?: string;
  competitionTitle?: string;
  competitionDeadlineLabel?: string;
}

export function WriterDashboard({ competitionSlug, competitionTitle, competitionDeadlineLabel }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState<AuthorStorySummary[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/kekere/stories/mine")
      .then((r) => r.json())
      .then(({ stories }) => setStories(stories))
      .catch(() => setError(true));
  }, []);

  async function handleNewStory() {
    setCreating(true);
    const params = new URLSearchParams();
    params.set("new", "1");
    if (competitionSlug) params.set("competition", competitionSlug);
    router.push(`/kekere/write?${params.toString()}`);
  }

  const editableStories = stories?.filter((s) => EDITABLE.includes(s.status)) ?? [];
  const otherStories = stories?.filter((s) => !EDITABLE.includes(s.status)) ?? [];

  return (
    <div className="min-h-screen bg-[#F5EBDD]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[rgba(42,26,18,.08)] bg-[#F5EBDD]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-5 py-3.5">
          <Link
            href="/kekere/feed"
            className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#C75D2C]"
          >
            Kekere
          </Link>
          <button
            type="button"
            onClick={handleNewStory}
            disabled={creating}
            className="flex items-center gap-2 rounded-[10px] bg-[#C75D2C] px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <PenLine size={15} />
            {creating ? "Starting…" : "New story"}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[680px] px-5 pb-20 pt-8">
        {/* Competition banner */}
        {competitionTitle && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-[rgba(199,93,44,.2)] bg-[rgba(199,93,44,.05)] px-4 py-3.5">
            <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] bg-[#C75D2C] text-[11px] text-white">✓</span>
            <div>
              <p className="text-[14px] font-semibold text-[#2A1A12]">{competitionTitle}</p>
              {competitionDeadlineLabel && (
                <p className="mt-0.5 text-[12px] text-[rgba(42,26,18,.55)]">{competitionDeadlineLabel}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleNewStory}
              disabled={creating}
              className="ml-auto flex-none rounded-[8px] bg-[#C75D2C] px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Starting…" : "Submit a story"}
            </button>
          </div>
        )}

        <h1 className="mb-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#2A1A12]">
          Your stories
        </h1>
        <p className="mb-8 text-[14px] text-[rgba(42,26,18,.55)]">
          Pick up where you left off, or start something new.
        </p>

        {/* Loading skeleton */}
        {stories === null && !error && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl bg-[rgba(42,26,18,.05)]" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-dashed border-[rgba(42,26,18,.18)] bg-[rgba(42,26,18,.02)] px-6 py-10 text-center">
            <p className="text-[14px] text-[rgba(42,26,18,.55)]">Couldn&apos;t load your stories. Try refreshing.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 text-[13px] font-semibold text-[#C75D2C] underline">
              Refresh
            </button>
          </div>
        )}

        {/* Empty state */}
        {stories !== null && stories.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[rgba(42,26,18,.15)] bg-[rgba(42,26,18,.02)] px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(42,26,18,.06)] text-[24px]">
              ✍
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[#2A1A12]">
                No stories yet
              </p>
              <p className="mt-1 text-[14px] text-[rgba(42,26,18,.55)]">
                Your first story is waiting to be written.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewStory}
              disabled={creating}
              className="mt-1 flex items-center gap-2 rounded-[10px] bg-[#C75D2C] px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
            >
              <PenLine size={14} />
              {creating ? "Starting…" : "Write your first story"}
            </button>
          </div>
        )}

        {/* In-progress drafts */}
        {editableStories.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-[rgba(42,26,18,.45)]">
              Continue writing
            </h2>
            <div className="flex flex-col gap-2.5">
              {editableStories.map((story) => (
                <StoryCard key={story.id} story={story} competitionSlug={competitionSlug} />
              ))}
            </div>
          </section>
        )}

        {/* Other stories (submitted, published, rejected) */}
        {otherStories.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-[rgba(42,26,18,.45)]">
              All stories
            </h2>
            <div className="flex flex-col gap-2.5">
              {otherStories.map((story) => (
                <StoryCard key={story.id} story={story} competitionSlug={competitionSlug} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StoryCard({ story, competitionSlug }: { story: AuthorStorySummary; competitionSlug?: string }) {
  const isEditable = EDITABLE.includes(story.status);
  const { bg, text } = STATUS_COLORS[story.status];

  const href = (() => {
    const params = new URLSearchParams();
    params.set("id", story.id);
    if (competitionSlug) params.set("competition", competitionSlug);
    return `/kekere/write?${params.toString()}`;
  })();

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-4 rounded-xl border bg-white px-4 py-4 transition-colors hover:border-[rgba(199,93,44,.35)] hover:shadow-sm",
        "border-[rgba(42,26,18,.08)]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              bg, text
            )}
          >
            {STATUS_ICON[story.status]}
            {STATUS_LABEL[story.status]}
          </span>
        </div>
        <p className="truncate font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#2A1A12] group-hover:text-[#C75D2C] transition-colors">
          {story.title || "Untitled story"}
        </p>
        {story.hookLine && story.hookLine.trim() && (
          <p className="mt-0.5 truncate text-[13px] italic text-[rgba(42,26,18,.55)]">
            {story.hookLine}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-[12px] text-[rgba(42,26,18,.4)]">
          <span>{story.wordCount.toLocaleString()} words</span>
          {story.wordCount > 0 && (
            <>
              <span>·</span>
              <span>{readingTime(story.wordCount)}</span>
            </>
          )}
          <span>·</span>
          <span>
            {isEditable && story.lastSavedAt
              ? `Saved ${relTime(story.lastSavedAt)}`
              : `Updated ${relTime(story.updatedAt)}`}
          </span>
        </div>
      </div>
      <span className="flex-none pt-1 text-[20px] text-[rgba(42,26,18,.2)] transition-colors group-hover:text-[#C75D2C]">
        ›
      </span>
    </Link>
  );
}
