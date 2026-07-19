import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface SearchMatch {
  from: number;
  to: number;
}

interface SearchAndReplaceState {
  searchTerm: string;
  results: SearchMatch[];
  currentIndex: number; // -1 when there's no active match
}

export const searchAndReplacePluginKey = new PluginKey<SearchAndReplaceState>("searchAndReplace");

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walks each textblock (paragraph) and matches against its full plain text
 * rather than node-by-node — a search term can span a mark boundary (e.g.
 * "s bold t" crossing from plain text into a bold run, which are separate
 * text nodes), and matching per-node alone would miss those.
 */
function findMatches(doc: ProseMirrorNode, searchTerm: string): SearchMatch[] {
  if (!searchTerm) return [];
  const regex = new RegExp(escapeRegExp(searchTerm), "gi");
  const results: SearchMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;

    let text = "";
    const offsets: number[] = [];
    node.forEach((child, childOffset) => {
      if (child.isText && child.text) {
        const base = pos + 1 + childOffset;
        for (let i = 0; i < child.text.length; i++) {
          offsets.push(base + i);
        }
        text += child.text;
      }
    });

    for (const match of Array.from(text.matchAll(regex))) {
      if (!match[0]) continue; // guard against a zero-length match looping forever
      const start = match.index ?? 0;
      const end = start + match[0].length;
      results.push({ from: offsets[start], to: offsets[end - 1] + 1 });
    }
    return false; // paragraphs don't nest, no need to descend further
  });

  return results;
}

function buildDecorations(doc: ProseMirrorNode, results: SearchMatch[], currentIndex: number): DecorationSet {
  return DecorationSet.create(
    doc,
    results.map((match, i) =>
      Decoration.inline(match.from, match.to, {
        class: i === currentIndex ? "kekere-search-match kekere-search-match-current" : "kekere-search-match",
      })
    )
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      /** Sets the search term and jumps to the first match. Empty string clears the search. */
      setSearchTerm: (searchTerm: string) => ReturnType;
      /** Moves to the match at `index`, wrapping around either end. */
      goToSearchResult: (index: number) => ReturnType;
      /** Replaces the match at `index` with `replaceTerm`, preserving its marks (bold/italic/etc). */
      replaceSearchResult: (index: number, replaceTerm: string) => ReturnType;
      /** Replaces every current match with `replaceTerm`, each keeping its own marks. */
      replaceAllSearchResults: (replaceTerm: string) => ReturnType;
    };
  }
}

/**
 * Search-and-replace for the writer editor. Deliberately literal-substring
 * matching (search text is regex-escaped) rather than exposing full regex
 * to writers — simpler mental model, and avoids a pathological user-supplied
 * pattern hanging the editor.
 */
export const SearchAndReplace = Extension.create({
  name: "searchAndReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchAndReplaceState>({
        key: searchAndReplacePluginKey,
        state: {
          init(): SearchAndReplaceState {
            return { searchTerm: "", results: [], currentIndex: -1 };
          },
          apply(tr, prev): SearchAndReplaceState {
            const meta = tr.getMeta(searchAndReplacePluginKey) as
              | { searchTerm?: string; setIndex?: number }
              | undefined;

            // setIndex is handled after the searchTerm branch below, so
            // when both are present in the same meta (replaceSearchResult
            // does this) the explicit index wins over searchTerm's own
            // reset-to-first-match default.

            let next = prev;

            if (meta?.searchTerm !== undefined) {
              const results = findMatches(tr.doc, meta.searchTerm);
              next = { searchTerm: meta.searchTerm, results, currentIndex: results.length > 0 ? 0 : -1 };
            } else if (tr.docChanged && prev.searchTerm) {
              // The doc changed for some other reason (normal typing) —
              // re-run the search so match positions/count stay accurate.
              const results = findMatches(tr.doc, prev.searchTerm);
              next = {
                ...prev,
                results,
                currentIndex: results.length > 0 ? Math.min(prev.currentIndex, results.length - 1) : -1,
              };
            }

            if (meta?.setIndex !== undefined) {
              const count = next.results.length;
              next = {
                ...next,
                currentIndex: count > 0 ? ((meta.setIndex % count) + count) % count : -1,
              };
            }

            return next;
          },
        },
        props: {
          decorations(state) {
            const pluginState = searchAndReplacePluginKey.getState(state);
            if (!pluginState || pluginState.results.length === 0) return DecorationSet.empty;
            return buildDecorations(state.doc, pluginState.results, pluginState.currentIndex);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(searchAndReplacePluginKey, { searchTerm }));
          return true;
        },

      goToSearchResult:
        (index: number) =>
        ({ tr, state, dispatch }) => {
          const pluginState = searchAndReplacePluginKey.getState(state);
          if (!pluginState || pluginState.results.length === 0) return false;
          const count = pluginState.results.length;
          const clamped = ((index % count) + count) % count;
          if (dispatch) {
            dispatch(tr.setMeta(searchAndReplacePluginKey, { setIndex: clamped }).scrollIntoView());
          }
          return true;
        },

      replaceSearchResult:
        (index: number, replaceTerm: string) =>
        ({ tr, state, dispatch }) => {
          const pluginState = searchAndReplacePluginKey.getState(state);
          const match = pluginState?.results[index];
          if (!pluginState || !match) return false;

          if (dispatch) {
            const marks = tr.doc.resolve(match.from).marks();
            if (replaceTerm.length > 0) {
              tr.replaceWith(match.from, match.to, state.schema.text(replaceTerm, marks));
            } else {
              tr.delete(match.from, match.to);
            }
            // The replaced occurrence drops out of the results array, so
            // whatever was the *next* match slides into this same index —
            // passing it back as setIndex naturally advances to the next
            // occurrence instead of jumping back to the first match.
            dispatch(
              tr
                .setMeta(searchAndReplacePluginKey, { searchTerm: pluginState.searchTerm, setIndex: index })
                .scrollIntoView()
            );
          }
          return true;
        },

      replaceAllSearchResults:
        (replaceTerm: string) =>
        ({ tr, state, dispatch }) => {
          const pluginState = searchAndReplacePluginKey.getState(state);
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            // Reverse order — replacing a later match doesn't shift the
            // positions of matches that come before it in the document.
            for (let i = pluginState.results.length - 1; i >= 0; i--) {
              const match = pluginState.results[i];
              const marks = tr.doc.resolve(match.from).marks();
              if (replaceTerm.length > 0) {
                tr.replaceWith(match.from, match.to, state.schema.text(replaceTerm, marks));
              } else {
                tr.delete(match.from, match.to);
              }
            }
            dispatch(tr.setMeta(searchAndReplacePluginKey, { searchTerm: pluginState.searchTerm }));
          }
          return true;
        },
    };
  },
});
