import { generateUniqueIds } from "@tiptap/extension-unique-id";
import { createReaderExtensions } from "@/lib/tiptap/editor-config";

/**
 * Shared helpers for working with Tiptap JSON documents server-side (where
 * we don't have a live editor instance to ask). Every Story.body is one of
 * these — see the schema comment on Story.body for the shape contract.
 */

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapTextNode {
  type: "text";
  text: string;
  marks?: TiptapMark[];
}

export interface TiptapParagraphNode {
  type: "paragraph";
  attrs?: { id?: string };
  content?: TiptapTextNode[];
}

export interface TiptapDoc {
  type: "doc";
  content: TiptapParagraphNode[];
}

export function isValidTiptapDoc(value: unknown): value is TiptapDoc {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  return doc.type === "doc" && Array.isArray(doc.content);
}

/** Splits plain text on blank lines into paragraph nodes, each with a fresh id. */
export function plainTextToDoc(text: string): TiptapDoc {
  const paragraphs = text
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      attrs: { id: crypto.randomUUID() },
      content: [{ type: "text", text }],
    })),
  };
}

/** Mutates nothing — returns a new doc where every paragraph has attrs.id,
 * generating one for any that's missing (e.g. content pasted in from
 * somewhere that didn't carry Tiptap's UniqueID marks). Uses Tiptap's own
 * generateUniqueIds() so the server assigns IDs the exact same way the live
 * editor would, without needing a real Editor instance. */
export function ensureParagraphIds(doc: TiptapDoc): TiptapDoc {
  return generateUniqueIds(doc, createReaderExtensions()) as TiptapDoc;
}

function paragraphPlainText(node: TiptapParagraphNode): string {
  return (node.content ?? []).map((t) => t.text).join("");
}

/** Every paragraph id actually present in a doc — used to validate that a
 * paragraph comment is anchored to a paragraph that really exists, rather
 * than trusting a client-supplied id outright. */
export function extractParagraphIds(doc: TiptapDoc): Set<string> {
  const ids = new Set<string>();
  for (const node of doc.content) {
    if (node.type === "paragraph" && node.attrs?.id) {
      ids.add(node.attrs.id);
    }
  }
  return ids;
}

export function docToPlainText(doc: TiptapDoc): string {
  return doc.content.map(paragraphPlainText).join("\n\n");
}

export interface ParagraphWordRange {
  id: string;
  words: number;
  /** Cumulative word count of every paragraph before this one — lets a
   * consumer derive a proportional time offset without re-summing. */
  wordsBefore: number;
}

/** Per-paragraph word counts (in document order) — the basis for the
 * audio player's approximate paragraph-sync timing (Phase B6): each
 * paragraph's estimated share of total playback time is
 * words / totalWords. Paragraphs without an id are skipped (can't be
 * highlighted in the DOM without one anyway). */
export function getParagraphWordRanges(doc: TiptapDoc): ParagraphWordRange[] {
  let wordsBefore = 0;
  const ranges: ParagraphWordRange[] = [];
  for (const node of doc.content) {
    if (node.type !== "paragraph" || !node.attrs?.id) continue;
    const text = paragraphPlainText(node).trim();
    const words = text.length === 0 ? 0 : text.split(/\s+/).length;
    ranges.push({ id: node.attrs.id, words, wordsBefore });
    wordsBefore += words;
  }
  return ranges;
}

export function countWords(doc: TiptapDoc): number {
  const text = docToPlainText(doc).trim();
  return text.length === 0 ? 0 : text.split(/\s+/).length;
}

const MARK_TAGS: Record<string, [string, string]> = {
  bold: ["<strong>", "</strong>"],
  italic: ["<em>", "</em>"],
  underline: ["<u>", "</u>"],
  strike: ["<s>", "</s>"],
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textNodeToHtml(node: TiptapTextNode): string {
  const marks = node.marks ?? [];
  return marks.reduce((html, mark) => {
    const tags = MARK_TAGS[mark.type];
    return tags ? `${tags[0]}${html}${tags[1]}` : html;
  }, escapeHtml(node.text));
}

/** Renders a doc to HTML, preserving bold/italic/underline/strike — used
 * where we need real formatting outside the live editor (e.g. admin
 * moderation preview). Each <p> carries data-paragraph-id, same as the
 * live reader, so it's visually/structurally consistent everywhere. */
export function docToHtml(doc: TiptapDoc): string {
  return doc.content
    .map((node) => {
      const inner = (node.content ?? []).map(textNodeToHtml).join("");
      const id = node.attrs?.id;
      return `<p${id ? ` data-paragraph-id="${id}"` : ""}>${inner}</p>`;
    })
    .join("\n");
}

/**
 * Truncates a doc to roughly the first `fraction` of its plain-text length,
 * cutting at a word boundary and appending an ellipsis — the JSON-doc
 * equivalent of the old previewFraction(). Formatting marks on the text up
 * to the cut point are preserved; the ellipsis itself is added as plain
 * unformatted text.
 *
 * Security note: this is the paywall gate — a locked story's full doc must
 * never be constructed client-side from this output, so paragraphs past the
 * cut point are dropped entirely here, not just visually hidden.
 */
export function truncateDocToFraction(doc: TiptapDoc, fraction = 0.1): TiptapDoc {
  const fullLength = docToPlainText(doc).replace(/\n\n/g, " ").length;
  const targetLength = Math.ceil(fullLength * fraction);

  const content: TiptapParagraphNode[] = [];
  let consumed = 0;

  for (const node of doc.content) {
    const text = paragraphPlainText(node);
    if (consumed >= targetLength) break;

    if (consumed + text.length <= targetLength) {
      content.push(node);
      consumed += text.length;
      continue;
    }

    // This paragraph straddles the cut point — truncate it at a word
    // boundary and stop. Keep the marks of whichever text node we cut
    // inside (good enough fidelity for a teaser).
    const remaining = targetLength - consumed;
    const truncated = truncateTextNodesTo(node.content ?? [], remaining);
    content.push({ ...node, content: truncated });
    consumed = targetLength;
    break;
  }

  return { type: "doc", content };
}

function truncateTextNodesTo(nodes: TiptapTextNode[], maxLength: number): TiptapTextNode[] {
  const result: TiptapTextNode[] = [];
  let used = 0;

  for (const node of nodes) {
    if (used >= maxLength) break;
    const room = maxLength - used;
    if (node.text.length <= room) {
      result.push(node);
      used += node.text.length;
      continue;
    }

    const slice = node.text.slice(0, room);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
    result.push({ ...node, text: cut });
    used = maxLength;
  }

  if (result.length > 0) {
    const last = result[result.length - 1];
    result[result.length - 1] = { ...last, text: last.text + "…" };
  }

  return result;
}
