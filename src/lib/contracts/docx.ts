import { BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";

/**
 * Fallback for generateSignedContractPdf (src/lib/contracts/pdf.ts) — that
 * PDF renderer uses pdf-lib's standard 14 fonts, which only support
 * WinAnsi-encodable characters and throw on anything outside that (notably
 * the tonal/underdot diacritics in many Yoruba and Igbo names, e.g.
 * "Ọláyínká"). A writer whose name pdf-lib can't encode would otherwise get
 * an email with no attachment at all. docx writes plain OOXML text with no
 * font-encoding restriction, so it works for any signer's name or contract
 * body regardless of script.
 */
export async function generateSignedContractDocx(
  contractBody: string,
  signedName: string,
  signedAt: Date,
  signerIp: string
): Promise<Buffer> {
  const bodyParagraphs = contractBody
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => new Paragraph({ children: [new TextRun(para)], spacing: { after: 200 } }));

  const document = new Document({
    sections: [
      {
        children: [
          ...bodyParagraphs,
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature Block", bold: true, size: 28 })],
            spacing: { after: 100 },
          }),
          new Paragraph({ text: `Signed by: ${signedName}` }),
          new Paragraph({ text: `Date: ${signedAt.toISOString().replace("T", " ").slice(0, 19)} UTC` }),
          new Paragraph({ text: `IP Address: ${signerIp}`, spacing: { after: 300 } }),
          new Paragraph({
            children: [new TextRun({ text: "Kekere Stories — narriva.com", size: 20 })],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
