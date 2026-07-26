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
function buildDecorations(doc: ProseMirrorNode, highlights: HighlightSpan[]): DecorationSet {
  if (highlights.length === 0) return DecorationSet.empty;

  const byParagraph = new Map<string, HighlightSpan[]>();
  for (const h of highlights) {
    const list = byParagraph.get(h.paragraphId) ?? [];
    list.push(h);
    byParagraph.set(h.paragraphId, list);
  }
  if (byParagraph.size === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const paragraphId = node.attrs.id as string | undefined;
    const spans = paragraphId ? byParagraph.get(paragraphId) : undefined;
    if (!spans) return false;

    const positions: number[] = [];
    node.forEach((child, childOffset) => {
      if (child.isText && child.text) {
        const base = pos + 1 + childOffset;
        for (let i = 0; i < child.text.length; i++) positions.push(base + i);
      }
    });

    for (const span of spans) {
      const from = positions[span.startOffset];
      // positions[endOffset - 1] is the last highlighted character's own
      // position; Decoration.inline's `to` is exclusive, hence +1.
      const to = positions[span.endOffset - 1];
      if (from === undefined || to === undefined) continue; // stale offset (paragraph text since edited) — skip rather than render garbage
      decorations.push(
        Decoration.inline(from, to + 1, {
          class: "reader-highlight",
          style: `background-color:${span.color}`,
          "data-highlight-id": span.id,
        })
      );
    }
    return false; // paragraphs don't nest
  });

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
