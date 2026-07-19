import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { plainTextToDoc, type TiptapDoc } from "./doc-utils";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOC_MIME_TYPE = "application/msword";

export class DocxImportError extends Error {}

/** word-extractor (used for legacy .doc) separates paragraphs with a single
 * "\n", unlike mammoth's "\n\n" for .docx — normalize to blank-line-separated
 * so plainTextToDoc() (which splits on /\n\n+/) treats each line as its own
 * paragraph either way. */
function linesToParagraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Converts an uploaded Word document (.doc or .docx) into a Tiptap doc.
 * Formatting (bold/italic/etc.) is dropped; paragraph breaks are preserved. */
export async function wordBufferToDoc(buffer: Buffer, isLegacyDoc: boolean): Promise<TiptapDoc> {
  let text: string;

  if (isLegacyDoc) {
    try {
      const extractor = new WordExtractor();
      const document = await extractor.extract(buffer);
      text = linesToParagraphs(document.getBody());
    } catch {
      throw new DocxImportError("Couldn't read that file — make sure it's a valid Word document.");
    }
  } else {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } catch {
      throw new DocxImportError("Couldn't read that file — make sure it's a valid Word document.");
    }
  }

  if (!text.trim()) {
    throw new DocxImportError("That document appears to be empty.");
  }

  return plainTextToDoc(text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** .docx run-formatting → HTML tag, so the writer editor's HTML→Tiptap
 * conversion (generateJSON, run client-side against the same schema the
 * live editor uses) picks the marks up. Bold/italic/strikethrough are
 * mammoth's own defaults; underline is opt-in (mammoth drops it by default
 * since underlining can be confused with links) — mapped straight to <u>,
 * which the editor's Underline extension already parses. */
const DOCX_STYLE_MAP = ["u => u"];

/** Converts an uploaded Word document into HTML, preserving the marks the
 * writer editor actually supports (bold/italic/underline/strikethrough) —
 * unlike wordBufferToDoc above, which is plain-text-only and is kept as is
 * for the competition-entry upload path that doesn't need formatting.
 * Legacy .doc can't carry inline formatting (word-extractor is text-only),
 * so it only gets paragraph breaks. */
export async function wordBufferToHtml(buffer: Buffer, isLegacyDoc: boolean): Promise<string> {
  let html: string;

  if (isLegacyDoc) {
    try {
      const extractor = new WordExtractor();
      const document = await extractor.extract(buffer);
      const paragraphs = linesToParagraphs(document.getBody()).split(/\n\n+/).filter(Boolean);
      html = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    } catch {
      throw new DocxImportError("Couldn't read that file — make sure it's a valid Word document.");
    }
  } else {
    try {
      const result = await mammoth.convertToHtml({ buffer }, { styleMap: DOCX_STYLE_MAP });
      html = result.value;
    } catch {
      throw new DocxImportError("Couldn't read that file — make sure it's a valid Word document.");
    }
  }

  if (!html.replace(/<[^>]+>/g, "").trim()) {
    throw new DocxImportError("That document appears to be empty.");
  }

  return html;
}
