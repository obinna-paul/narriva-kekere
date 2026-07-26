import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface HighlightSpan {
  id: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  /** CSS color value (already resolved from a HighlightColorId — see
   * HIGHLIGHT_COLOR_BY_ID — not the raw id), painted directly via inline
   * style since the color varies per-span and can't be a single Tailwind
   * class the way kekere-search-match's fixed color can. */
  color: string;
  /** The highlighted text itself, used to re-find the span when the
   * paragraph id or offsets no longer line up — see buildDecorations. */
  text?: string;
}

interface HighlightsPluginState {
  highlights: HighlightSpan[];
}

export const readerHighlightsPluginKey = new PluginKey<HighlightsPluginState>("readerHighlights");

/**
 * Same per-child text-node offset-mapping technique as
 * search-and-replace.ts's findMatches(): a paragraph's plain-text offsets
 * (as computed client-side from DOM textContent, and server-side by
 * paragraphPlainText() in doc-utils.ts) don't map 1:1 to ProseMirror
 * document positions when a paragraph has multiple text-node children (e.g.
 * a bold run splits "hello **world**" into two text nodes) — this walks
 * each paragraph's children once to build that offset->position table.
 */
interface TextBlock {
  id: string | undefined;
  text: string;
  /** positions[n] is the document position of the block's nth character. */
  positions: number[];
}

function collectTextBlocks(doc: ProseMirrorNode): TextBlock[] {
  const blocks: TextBlock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const positions: number[] = [];
    let text = "";
    node.forEach((child, childOffset) => {
      if (child.isText && child.text) {
        const base = pos + 1 + childOffset;
        for (let i = 0; i < child.text.length; i++) positions.push(base + i);
        text += child.text;
      }
    });
    blocks.push({ id: node.attrs.id as string | undefined, text, positions });
    return false; // paragraphs don't nest
  });
  return blocks;
}

/**
 * Locates a highlight in the rendered document. Mirrors the server's
 * resolveHighlightAnchor (kekere-highlights.ts) deliberately: the paragraph
 * id is a hint, and the highlighted text is what actually pins the span
 * down. Anchoring on the id alone meant that any drift between the id the
 * reader is rendering and the id the highlight was stored against produced
 * no decoration at all — the highlight simply not appearing, with nothing
 * to distinguish it from a save that failed.
 */
function locateSpan(blocks: TextBlock[], span: HighlightSpan): { block: TextBlock; start: number; end: number } | null {
  const byId = blocks.find((b) => b.id === span.paragraphId);
  if (byId && byId.text.slice(span.startOffset, span.endOffset) === span.text) {
    return { block: byId, start: span.startOffset, end: span.endOffset };
  }

  // Nothing to re-anchor against (a record stored before `text` was kept, or
  // an empty one) — the id is all there is, so trust it and its offsets.
  if (!span.text) {
    return byId ? { block: byId, start: span.startOffset, end: span.endOffset } : null;
  }

  const sameOffsets = blocks.find((b) => b.text.slice(span.startOffset, span.endOffset) === span.text);
  if (sameOffsets) return { block: sameOffsets, start: span.startOffset, end: span.endOffset };

  for (const block of blocks) {
    const index = block.text.indexOf(span.text);
    if (index !== -1) return { block, start: index, end: index + span.text.length };
  }

  return null;
}

function buildDecorations(doc: ProseMirrorNode, highlights: HighlightSpan[]): DecorationSet {
  if (highlights.length === 0) return DecorationSet.empty;

  const blocks = collectTextBlocks(doc);
  const decorations: Decoration[] = [];

  for (const span of highlights) {
    const located = locateSpan(blocks, span);
    if (!located) continue; // genuinely gone (the text was edited away) — skip rather than render garbage

    const from = located.block.positions[located.start];
    // positions[end - 1] is the last highlighted character's own position;
    // Decoration.inline's `to` is exclusive, hence +1.
    const to = located.block.positions[located.end - 1];
    if (from === undefined || to === undefined) continue;

    decorations.push(
      Decoration.inline(from, to + 1, {
        class: "reader-highlight",
        style: `background-color:${span.color}`,
        "data-highlight-id": span.id,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    readerHighlights: {
      /** Replaces the full set of highlights to render. Called whenever the
       * reader's highlights list changes — decorations are pure functions
       * of plugin state, so this is the only way to make them re-render
       * (mutating the array in place wouldn't trigger a new decoration
       * pass, since no transaction would have occurred). */
      setHighlights: (highlights: HighlightSpan[]) => ReturnType;
    };
  }
}

/** Renders private reader highlights as background-colored inline spans —
 * decorations only, never part of the document itself, so they can't leak
 * into what gets saved/exported and don't need undo/redo support. */
export const ReaderHighlights = Extension.create({
  name: "readerHighlights",

  addProseMirrorPlugins() {
    return [
      new Plugin<HighlightsPluginState>({
        key: readerHighlightsPluginKey,
        state: {
          init(): HighlightsPluginState {
            return { highlights: [] };
          },
          apply(tr, prev): HighlightsPluginState {
            const meta = tr.getMeta(readerHighlightsPluginKey) as { highlights?: HighlightSpan[] } | undefined;
            if (meta?.highlights !== undefined) return { highlights: meta.highlights };
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = readerHighlightsPluginKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            return buildDecorations(state.doc, pluginState.highlights);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setHighlights:
        (highlights: HighlightSpan[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(readerHighlightsPluginKey, { highlights }));
          return true;
        },
    };
  },
});
