import Link from "next/link";
import { Clock, Lock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MockStory } from "@/content/mock/kekere-stories";

export interface StoryCardProps {
  story: MockStory;
  className?: string;
}

/**
 * Netflix-poster-style card: a bold colour block doing the work a real cover
 * image will do post-Phase-11, title burned into the bottom of it, stats as
 * a tight badge row. Deliberately nothing like Narriva's BookCard — no
 * "buy" affordance, no serif type, no white card body under the cover.
 *
 * Locked (cowrie-gated) stories get a distinct treatment — desaturated cover,
 * centred lock badge, cowrie cost up front — so the catalogue itself
 * communicates "earn to unlock" rather than hiding the gate behind a small
 * corner tag. Free stories keep the full-colour cover as the reward signal.
 */
export function StoryCard({ story, className }: StoryCardProps) {
  const locked = true; // all stories are paid

  return (
    <Link
      href={`/kekere/story/${story.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm shadow-black/5 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        className
      )}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{ backgroundColor: story.coverColor }}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 transition-opacity duration-300",
            !locked && "group-hover:opacity-0"
          )}
        />

        {locked && (
          <div className="absolute inset-0 bg-black/55 backdrop-grayscale" />
        )}

        <div className="absolute left-3 top-3 flex gap-1.5">
          {story.isNew && (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink)] shadow-sm">
              New
            </span>
          )}
          {story.isTrending && (
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink)] shadow-sm">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Hot
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-gold)] shadow-lg">
            <Lock className="h-5 w-5 text-[var(--color-maroon-deep)]" aria-hidden="true" />
          </span>
          <span className="rounded-full bg-[var(--color-gold)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-maroon-deep)]">
            {story.cowrieCost} Cowries
          </span>
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-14 transition-transform duration-300",
            !locked && "group-hover:translate-y-[-2px]"
          )}
        >
          <h3
            className={cn(
              "text-balance text-base font-bold leading-snug drop-shadow-sm",
              locked ? "text-white/70" : "text-white"
            )}
          >
            {story.title}
          </h3>
        </div>
      </div>

      <div className="p-3.5">
        <p className="line-clamp-2 text-sm text-[var(--color-ink)]/80">{story.hookLine}</p>
        <div className="mt-2.5 flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {story.readingTimeMinutes} min
          </span>
          <span>{story.completionRate}% finish this</span>
        </div>
      </div>
    </Link>
  );
}
