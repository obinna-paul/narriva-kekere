import type { TiptapDoc, TiptapInlineNode } from "@/lib/tiptap/doc-utils";

/**
 * The writer's review decisions, resolved into a final document.
 *
 * Deliberately dependency-free (no Prisma, no server imports) so the writer's
 * review screen can render its "final version" preview by calling the very
 * function the server merges with, rather than reimplementing the rules in the
 * browser and drifting out of agreement with the backend over time.
 */
/**
 * Merges the writer's per-paragraph accept/reject decisions into a final doc,
 * walking the editor's proposed (edited) order so accepted new paragraphs keep
 * their place. A rejected *change* reverts that paragraph to the writer's
 * original text; a rejected *new* paragraph is dropped; a rejected *removal*
 * (the editor deleted a paragraph the writer wants kept) re-inserts the
 * original paragraph after its nearest surviving predecessor. Decisions
 * default to "accept" when a paragraph id is absent.
 *
 * @param paragraphEdits — paragraphId → the writer's own rewritten inline
 * content. Applied last, so a writer's tweak wins over whichever version their
 * accept/reject choice would otherwise have landed on — their edit *is* the
 * decision. Ends up in editedBody, which is what the editor's tracked-changes
 * view diffs against the original, so the editor sees the writer's wording
 * marked up exactly like their own edits were.
 */
export function mergeReviewedBody(
  original: TiptapDoc,
  edited: TiptapDoc,
  decisions: Record<string, "accept" | "reject">,
  paragraphEdits: Record<string, TiptapInlineNode[]> = {},
): { merged: TiptapDoc; fullyAccepted: boolean } {
  const origById = new Map((original.content ?? []).filter((n) => n.attrs?.id).map((n) => [n.attrs!.id as string, n]));
  const editedIds = new Set((edited.content ?? []).filter((n) => n.attrs?.id).map((n) => n.attrs!.id as string));
  let fullyAccepted = true;

  const content: typeof edited.content = [];
  for (const node of edited.content ?? []) {
    const id = node.attrs?.id;
    const decision = id ? decisions[id] ?? "accept" : "accept";
    const isNew = !id || !origById.has(id);
    const isChanged = !isNew && JSON.stringify(origById.get(id!)) !== JSON.stringify(node);

    if (decision === "reject" && (isNew || isChanged)) {
      fullyAccepted = false;
      if (isNew) continue; // drop the rejected addition
      content.push(origById.get(id!)!); // revert to the writer's original text
    } else {
      content.push(node);
    }
  }

  // Removed paragraphs (in original, not in edited). Rejecting the removal
  // re-inserts the original paragraph after its nearest surviving predecessor.
  const origList = (original.content ?? []).filter((n) => n.attrs?.id);
  for (let i = 0; i < origList.length; i++) {
    const node = origList[i];
    const id = node.attrs!.id as string;
    if (editedIds.has(id)) continue; // not removed
    // Rewriting a paragraph the editor deleted is itself a refusal of the
    // deletion — the writer wants it, in their words. Without this the
    // paragraph never re-enters `content`, so the rewrite below has nothing
    // to attach to and their text is silently dropped on submit.
    const rewritten = paragraphEdits[id] != null;
    if (!rewritten && (decisions[id] ?? "accept") === "accept") continue; // removal accepted → stays gone
    fullyAccepted = false;
    // Find the nearest earlier original paragraph that survived into `content`.
    let insertAt = 0;
    for (let j = i - 1; j >= 0; j--) {
      const prevId = origList[j].attrs!.id as string;
      const idx = content.findIndex((n) => n.attrs?.id === prevId);
      if (idx >= 0) { insertAt = idx + 1; break; }
    }
    content.splice(insertAt, 0, node);
  }

  // Apply the writer's own rewrites last so they win over whatever their
  // accept/reject choice left in place. An edit is itself a departure from
  // what the editor proposed, so it also means this can't be a clean
  // "accepted everything" submission.
  const withEdits = content.map((node) => {
    const id = node.attrs?.id;
    const writerContent = id ? paragraphEdits[id] : undefined;
    if (!writerContent) return node;
    fullyAccepted = false;
    return { ...node, content: writerContent };
  });

  return { merged: { type: "doc", content: withEdits }, fullyAccepted };
}
