import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { TiptapDoc, TiptapInlineNode, TiptapParagraphNode } from "./doc-utils";

const ALIGNMENT: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

/** Used to crash here on a hardBreak (Shift+Enter) node — took only
 * TiptapTextNode and read node.text with nothing to fall back on. A writer
 * exporting a story with a manual line break to Word got a 500 instead of a
 * document. docx's TextRun supports `break: 1` for exactly this — a line
 * break within the same paragraph, the .docx equivalent of the <br/> the
 * HTML renderer emits for the same node in doc-utils.ts. */
function toTextRun(node: TiptapInlineNode): TextRun {
  if (node.type !== "text") return new TextRun({ break: 1 });
  const marks = new Set((node.marks ?? []).map((m) => m.type));
  return new TextRun({
    text: node.text,
    bold: marks.has("bold"),
    italics: marks.has("italic"),
    underline: marks.has("underline") ? {} : undefined,
    strike: marks.has("strike"),
  });
}

function toParagraph(node: TiptapParagraphNode): Paragraph {
  const runs = (node.content ?? []).map(toTextRun);
  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun("")],
    alignment: node.attrs?.textAlign ? ALIGNMENT[node.attrs.textAlign] : undefined,
    spacing: { after: 200 },
  });
}

/** Renders a story's Tiptap doc to a .docx buffer — bold/italic/underline/
 * strike marks and paragraph alignment carry over, giving a writer whose
 * story was rejected (or hasn't been submitted yet) a usable document back,
 * not just their raw text. */
export async function tiptapDocToDocxBuffer(
  doc: TiptapDoc,
  title: string,
  hookLine?: string
): Promise<Buffer> {
  const trimmedHook = hookLine?.trim();

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...(trimmedHook
            ? [new Paragraph({ children: [new TextRun({ text: trimmedHook, italics: true })], spacing: { after: 300 } })]
            : []),
          ...(doc.content ?? []).map(toParagraph),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
