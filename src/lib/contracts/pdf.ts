import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TOP_Y = 740;

interface Cursor {
  page: PDFPage;
  y: number;
}

/**
 * Draws word-wrapped text at the current cursor, adding pages as needed.
 * Everything here is synchronous (fonts are embedded once, up front, by the
 * async callers) — pdf-lib's drawing API itself is sync; only
 * PDFDocument.create()/embedFont() return promises, which is exactly what the
 * previous version forgot to await.
 */
function drawText(
  doc: PDFDocument,
  cursor: Cursor,
  font: PDFFont,
  boldFont: PDFFont,
  text: string,
  size: number,
  useBold = false,
): void {
  const face = useBold ? boldFont : font;
  const lineHeight = size + 4;
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (face.widthOfTextAtSize(testLine, size) > USABLE_WIDTH && line) {
      cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size, font: face, color: rgb(0, 0, 0) });
      cursor.y -= lineHeight;
      line = word;
      if (cursor.y < MARGIN) {
        cursor.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursor.y = TOP_Y;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size, font: face, color: rgb(0, 0, 0) });
    cursor.y -= lineHeight;
  }

  cursor.y -= 6;
}

/** Renders the contract body paragraphs, returning the cursor where the
 * signature block (if any) should continue from. */
function renderBody(doc: PDFDocument, font: PDFFont, boldFont: PDFFont, contractBody: string): Cursor {
  const cursor: Cursor = { page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: TOP_Y };

  for (const para of contractBody.split(/\n\n+/)) {
    if (cursor.y < 100) {
      cursor.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursor.y = TOP_Y;
    }
    drawText(doc, cursor, font, boldFont, para.trim(), 11);
  }

  return cursor;
}

/** The blank (unsigned) agreement — attached to the "Publishing agreement"
 * email so a writer can read the full terms before signing. No signature
 * block. */
export async function generateUnsignedContractPdf(contractBody: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  renderBody(doc, font, boldFont, contractBody);
  return doc.save();
}

export async function generateSignedContractPdf(
  contractBody: string,
  signedName: string,
  signedAt: Date,
  signerIp: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await doc.embedFont(StandardFonts.TimesRomanBold);

  const cursor = renderBody(doc, font, boldFont, contractBody);

  cursor.y -= 20;
  if (cursor.y < 150) {
    cursor.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursor.y = TOP_Y;
  }

  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: PAGE_WIDTH - MARGIN, y: cursor.y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  cursor.y -= 20;

  drawText(doc, cursor, font, boldFont, "Signature Block", 14, true);
  drawText(doc, cursor, font, boldFont, `Signed by: ${signedName}`, 11);
  drawText(doc, cursor, font, boldFont, `Date: ${signedAt.toISOString().replace("T", " ").slice(0, 19)} UTC`, 11);
  drawText(doc, cursor, font, boldFont, `IP Address: ${signerIp}`, 11);

  cursor.y -= 30;
  drawText(doc, cursor, font, boldFont, "Kekere Stories — narriva.pro", 10);

  return doc.save();
}
