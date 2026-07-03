/**
 * Mock catalog for Kekere Stories. The story array is empty — all stories
 * are now real DB records. The MockStory type and KEKERE_GENRES are kept
 * because they're used as the TypeScript shape for adapted DB stories
 * throughout the app (see src/lib/adapters/kekere.ts).
 */
import type { StoryTier } from "@/content/decisions";

export const KEKERE_GENRES = [
  "Literary Fiction",
  "Romance",
  "Thriller",
  "Speculative Fiction",
  "Horror",
  "Drama",
  "Comedy",
  "Erotica",
  "Lagos",
  "Crime",
  "Historical Fiction",
] as const;

export type KekereGenre = (typeof KEKERE_GENRES)[number];

export interface MockStory {
  id: string;
  title: string;
  hookLine: string;
  authorName: string;
  authorId: string;
  /** KekereGenre for the mock catalog; real Story.genre is free text. */
  genre: KekereGenre | string;
  tier: StoryTier;
  isFree: boolean;
  cowrieCost: number;
  readingTimeMinutes: number;
  completionRate: number;
  isNew: boolean;
  isTrending: boolean;
  coverColor: string;
  publishedAt: string;
  /** Full body, paragraph by paragraph. The reader shows roughly the first
   * 10% (by character count) before gating the rest. */
  paragraphs: readonly string[];
  /** Real stories only — the Tiptap document the reader actually renders
   * (see toReaderStoryData). Already truncated server-side when locked.
   * null for the static mock catalog, which only ever populates `paragraphs`. */
  bodyDoc: import("@/lib/tiptap/doc-utils").TiptapDoc | null;
  /** Tag slugs assigned by admin at publish time. Empty array for mock/legacy stories. */
  tags: string[];
  /** Public URL for the cover image, if one has been uploaded.
   * Undefined = no image yet; UI falls back to the coverColor gradient. */
  coverImageUrl?: string;
}

export const MOCK_STORIES: readonly MockStory[] = [];

export function getStoryById(id: string): MockStory | undefined {
  return MOCK_STORIES.find((story) => story.id === id);
}
