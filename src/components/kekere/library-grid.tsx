import { StoryCard } from "@/components/kekere/story-card";
import type { MockStory } from "@/content/mock/kekere-stories";

export interface LibraryGridProps {
  stories: readonly MockStory[];
  emptyMessage: string;
}

export function LibraryGrid({ stories, emptyMessage }: LibraryGridProps) {
  if (stories.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--color-ink)]/50">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}
