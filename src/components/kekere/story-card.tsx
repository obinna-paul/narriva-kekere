import Link from "next/link";
import { Clock, TrendingUp } from "lucide-react";
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
 */
export function StoryCard({ story, className }: StoryCardProps) {
  return (
    <Link
      href={`/kekere/story/${story.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-[var(--color-ink)]/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        className
      )}
    >
      <div
        className="relative aspect-[3/4]"
        style={{ backgroundColor: story.coverColor }}
      >
        <div className="absolute left-3 top-3 flex gap-1.5">
          {story.isNew && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink)]">
              New
            </span>
          )}
          {story.isTrending && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink)]">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Hot
            </span>
          )}
        </div>

        <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {story.isFree ? "Free read" : `${story.cowrieCost} cowries`}
        </span>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 pt-12">
          <h3 className="text-balance text-base font-bold leading-snug text-white">
            {story.title}
          </h3>
        </div>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-sm text-[var(--color-ink)]/80">{story.hookLine}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-ink)]/50">
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
