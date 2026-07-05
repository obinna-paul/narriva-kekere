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
