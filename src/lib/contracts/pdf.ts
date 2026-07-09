import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface PdfLayout {
  doc: PDFDocument;
  y: number;
  margin: number;
}

function renderBody(doc: PDFDocument, contractBody: string): { y: number; margin: number } {
  const font = doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = doc.embedFont(StandardFonts.TimesRomanBold);
  let page = doc.addPage([612, 792]);
  const margin = 60;
  const usableWidth = 612 - margin * 2;
  let y = 740;

  function addText(text: string, size: number, useBold = false) {
    const face = useBold ? boldFont : font;
    const maxWidth = usableWidth;
    const lineHeight = size + 4;
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = face.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        page.drawText(line, { x: margin, y, size, font: face, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = word;

        if (y < margin) {
          page = doc.addPage([612, 792]);
          y = 740;
        }
      } else {
        line = testLine;
      }
    }

    if (line) {
      page.drawText(line, { x: margin, y, size, font: face, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    y -= 6;
  }

  const paragraphs = contractBody.split(/\n\n+/);
  for (const para of paragraphs) {
    if (y < 100) {
      page = doc.addPage([612, 792]);
      y = 740;
    }
    addText(para.trim(), 11);
  }

  return { y, margin };
}

export function generateUnsignedContractPdf(contractBody: string): Uint8Array {
  const doc = PDFDocument.create();
  renderBody(doc, contractBody);
  return doc.save();
}

export async function generateSignedContractPdf(
  contractBody: string,
  signedName: string,
  signedAt: Date,
  signerIp: string,
): Promise<Uint8Array> {
  const doc = PDFDocument.create();
  const font = doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = doc.embedFont(StandardFonts.TimesRomanBold);
  let { y, margin } = renderBody(doc, contractBody);

  const pages = doc.getPages();
  let signaturePage = pages[pages.length - 1];

  y -= 20;
  if (y < 150) {
    signaturePage = doc.addPage([612, 792]);
    y = 740;
  }

  signaturePage.drawLine({
    start: { x: margin, y },
    end: { x: 612 - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  function addSigText(text: string, size: number, useBold = false) {
    const face = useBold ? boldFont : font;
    const maxWidth = 612 - margin * 2;
    const lineHeight = size + 4;
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = face.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        signaturePage.drawText(line, { x: margin, y, size, font: face, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = word;
        if (y < margin) {
          signaturePage = doc.addPage([612, 792]);
          y = 740;
        }
      } else {
        line = testLine;
      }
    }

    if (line) {
      signaturePage.drawText(line, { x: margin, y, size, font: face, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    y -= 6;
  }

  addSigText("Signature Block", 14, true);
  addSigText(`Signed by: ${signedName}`, 11);
  addSigText(`Date: ${signedAt.toISOString().replace("T", " ").slice(0, 19)} UTC`, 11);
  addSigText(`IP Address: ${signerIp}`, 11);

  y -= 30;
  addSigText("Kekere Stories \u2014 narriva.pro", 10);

  return doc.save();
}
