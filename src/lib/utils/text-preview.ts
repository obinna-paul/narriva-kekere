import { truncateDocToFraction, type TiptapDoc } from "@/lib/tiptap/doc-utils";

/**
 * Shared "first ~10%" preview gate — used server-side by the stories API
 * (GET /api/kekere/stories/[id]) and the story detail page, so locked
 * stories never have their full body sent to the client at all (not just
 * hidden by CSS). Story.body is a Tiptap document; paragraphs past the cut
 * point are dropped from the JSON entirely, not just visually truncated.
 */
export function previewFraction(body: TiptapDoc, fraction = 0.1): TiptapDoc {
  return truncateDocToFraction(body, fraction);
}
