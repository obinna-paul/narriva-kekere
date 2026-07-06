import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { TiptapDoc, TiptapParagraphNode, TiptapTextNode } from "./doc-utils";

const ALIGNMENT: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

function toTextRun(node: TiptapTextNode): TextRun {
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
 * story was rejected a usable document back, not just their raw text. */
export async function tiptapDocToDocxBuffer(doc: TiptapDoc, title: string): Promise<Buffer> {
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...(doc.content ?? []).map(toParagraph),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
