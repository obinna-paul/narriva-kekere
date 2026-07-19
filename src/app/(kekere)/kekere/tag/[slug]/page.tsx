import { notFound } from "next/navigation";
import Link from "next/link";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { listStoriesByTag } from "@/lib/data/kekere-stories";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { TAG_BY_SLUG, resolveCategoryBySlug } from "@/content/story-tags";
import type { MockStory } from "@/content/mock/kekere-stories";

export const dynamic = "force-dynamic";

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

function StoryGrid({ stories }: { stories: MockStory[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-[14px] gap-y-[24px] px-5 sm:grid-cols-3">
      {stories.map((story) => (
        <Link
          key={story.id}
          href={`/kekere/story/${story.id}`}
          className="block"
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
            {story.completionRate > 0.8 && (
              <span className="absolute bottom-[9px] right-[9px] rounded-[20px] bg-[rgba(42,26,18,0.55)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
                {Math.round(story.completionRate * 100)}% finish
              </span>
            )}
          </div>
          <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-[15px] font-semibold leading-[1.2] text-[var(--color-ink)]">
            {story.title}
          </h3>
          <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] italic text-[var(--color-ink-muted)]">
            {story.hookLine}
          </p>
          <p className="mt-[6px] text-[11px] text-[var(--color-ink-muted-2)]">
            <span className="font-semibold text-[var(--color-primary)]">
              {story.cowrieCost} cowries
            </span>
            {" · "}
            {story.readingTimeMinutes} min
          </p>
        </Link>
      ))}
    </div>
  );
}

export default async function TagBrowsePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const category = resolveCategoryBySlug(params.slug);
  if (!category) notFound();

  // A merged category (e.g. dark/creepy/psychological) has no single tag
  // label of its own — show every member tag's label instead of just one.
  const eyebrow = category.tagSlugs
    .map((s) => TAG_BY_SLUG[s]?.label)
    .filter((label): label is string => !!label)
    .join(" · ");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const result = await listStoriesByTag(params.slug, page, 12);
  const stories = result.stories.map((s) => toFeedStoryData(s));

  return (
    <KekereTheme>
      <KekereNavWrapper />
      <div className="min-h-screen bg-[var(--color-bg)] pb-[calc(80px+env(safe-area-inset-bottom))] text-[var(--color-ink)]">
        {/* Header */}
        <div className="px-5 pb-6 pt-8">
          <Link
            href="/kekere/feed"
            className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Back to feed
          </Link>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-[1.15] text-[var(--color-ink)]">
            {category.title}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
            {result.total} {result.total === 1 ? "story" : "stories"}
          </p>
        </div>

        {/* Stories grid */}
        {stories.length > 0 ? (
          <StoryGrid stories={stories} />
        ) : (
          <p className="px-5 py-16 text-center text-sm text-[var(--color-ink)]/50">
            No stories with this tag yet. Check back soon.
          </p>
        )}

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3 px-5">
            {page > 1 && (
              <Link
                href={`/kekere/tag/${params.slug}?page=${page - 1}`}
                className="rounded-[30px] border border-[rgba(42,26,18,0.14)] bg-white px-5 py-[9px] text-[13px] font-semibold text-[var(--color-ink-muted)] hover:border-[rgba(42,26,18,0.25)]"
              >
                ← Previous
              </Link>
            )}
            <span className="text-[13px] text-[var(--color-ink-muted)]">
              Page {page} of {result.totalPages}
            </span>
            {page < result.totalPages && (
              <Link
                href={`/kekere/tag/${params.slug}?page=${page + 1}`}
                className="rounded-[30px] border border-[rgba(42,26,18,0.14)] bg-white px-5 py-[9px] text-[13px] font-semibold text-[var(--color-ink-muted)] hover:border-[rgba(42,26,18,0.25)]"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </KekereTheme>
  );
}
