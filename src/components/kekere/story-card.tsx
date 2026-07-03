import { Lock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MockStory } from "@/content/mock/kekere-stories";

export interface StoryCardProps {
  story: MockStory;
  className?: string;
  readProgress?: number;
  onPreview?: (story: MockStory) => void;
}

export function StoryCard({ story, className, readProgress, onPreview }: StoryCardProps) {
  const locked = true;

  const inner = (
    <>
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{ backgroundColor: story.coverColor }}
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
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
        {locked && <div className="absolute inset-0 bg-black/55 backdrop-grayscale" />}

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
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-gold)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-maroon-deep)]">
            <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
              <ellipse cx="12" cy="12" rx="6" ry="9" fill="currentColor" />
              <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.4" fill="none" />
            </svg>
            {story.cowrieCost}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-14">
          <h3 className="text-balance text-base font-bold leading-snug text-white/70 drop-shadow-sm">
            {story.title}
          </h3>
        </div>

        {readProgress != null && readProgress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[rgba(0,0,0,0.25)]">
            <div
              className="h-full rounded-r-full bg-[#C75D2C]"
              style={{ width: `${Math.round(readProgress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-3.5 pb-4">
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span className="flex items-center gap-[3px] font-semibold text-[var(--color-primary)]">
            <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
              <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
              <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
            </svg>
            {story.cowrieCost}
          </span>
          <span>·</span>
          <span>{story.readingTimeMinutes} min</span>
          {story.completionRate > 0 && (
            <><span>·</span><span>{Math.round(story.completionRate)}% finish</span></>
          )}
        </div>
      </div>
    </>
  );

  if (onPreview) {
    return (
      <button
        type="button"
        onClick={() => onPreview(story)}
        className={cn(
          "block w-full overflow-hidden rounded-2xl bg-[var(--color-surface)] text-left shadow-sm shadow-black/5 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
          className
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={`/kekere/story/${story.id}`}
      className={cn(
        "block overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm shadow-black/5 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        className
      )}
    >
      {inner}
    </a>
  );
}
