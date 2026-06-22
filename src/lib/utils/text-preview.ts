/**
 * Shared "first ~10%" preview gate — used server-side by the stories API
 * (GET /api/kekere/stories/[id]) and the story detail page, so locked
 * stories never have their full body sent to the client at all (not just
 * hidden by CSS). Story.body is paragraphs joined by "\n\n".
 */
export function previewFraction(body: string, fraction = 0.1): string {
  const full = body.replace(/\n\n/g, " ");
  const targetLength = Math.ceil(full.length * fraction);
  const truncated = full.slice(0, targetLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
