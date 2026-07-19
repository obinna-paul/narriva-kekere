import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import UniqueID from "@tiptap/extension-unique-id";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import type { AnyExtension } from "@tiptap/react";
import { generateUUID } from "@/lib/utils/uuid";
import { SearchAndReplace } from "@/lib/tiptap/search-and-replace";

/**
 * UniqueID (below) generates and assigns `attrs.id` on every paragraph —
 * that's the JSON shape later phases (paragraph comments/reactions) read.
 * By default it also *renders* that attribute to HTML as `data-id`. We need
 * the DOM attribute to be `data-paragraph-id` instead, so this extension
 * (registered after UniqueID) replaces just the render/parse side of that
 * same `id` attribute — it doesn't touch how/when the id is generated.
 */
const ParagraphIdAttribute = Extension.create({
  name: "paragraphIdAttribute",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          id: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-paragraph-id"),
            renderHTML: (attributes: { id?: string | null }) =>
              attributes.id ? { "data-paragraph-id": attributes.id } : {},
          },
        },
      },
    ];
  },
});

/**
 * The writer editor's extension set — deliberately restricted. No headings,
 * no lists, no code/quote blocks, no colour pickers. Three marks only:
 * bold, italic, underline. See docs/... PHASE B1 for why: writers shouldn't
 * be able to change fonts/sizes/structure, only emphasize words.
 */
export function createEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Underline,
    TextAlign.configure({
      types: ["paragraph"],
      alignments: ["left", "center", "right", "justify"],
      // Matches the reader's own default (createReaderExtensions below) —
      // what's typed should default to how it will actually be read.
      defaultAlignment: "justify",
    }),
    UniqueID.configure({
      types: ["paragraph"],
      generateID: () => generateUUID(),
      filterTransaction: (transaction) => !transaction.getMeta("paste"),
    }),
    ParagraphIdAttribute,
    CharacterCount.configure({ limit: null }),
    Placeholder.configure({ placeholder: "Start writing your story here..." }),
    SearchAndReplace,
  ];
}

/** Same node/mark set as the writer, minus the writer-only chrome
 * (placeholder text, live character count) — used by the read-only reader. */
export function createReaderExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Underline,
    TextAlign.configure({
      types: ["paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "justify",
    }),
    UniqueID.configure({
      types: ["paragraph"],
      generateID: () => generateUUID(),
      filterTransaction: (transaction) => !transaction.getMeta("paste"),
    }),
    ParagraphIdAttribute,
  ];
}
