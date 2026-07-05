import mammoth from "mammoth";
import { plainTextToDoc, type TiptapDoc } from "./doc-utils";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class DocxImportError extends Error {}

/** Converts an uploaded .docx file into a Tiptap doc. Mammoth joins each
 * source paragraph with "\n\n", which is exactly what plainTextToDoc()
 * splits on — so formatting (bold/italic/etc.) is dropped but paragraph
 * breaks are preserved. */
export async function docxBufferToDoc(buffer: Buffer): Promise<TiptapDoc> {
  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } catch {
    throw new DocxImportError("Couldn't read that file — make sure it's a valid .docx document.");
  }

  if (!text.trim()) {
    throw new DocxImportError("That document appears to be empty.");
  }

  return plainTextToDoc(text);
}
