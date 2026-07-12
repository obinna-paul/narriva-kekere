import { generateUnsignedContractPdf } from "@/lib/contracts/pdf";
import { generateUnsignedContractDocx } from "@/lib/contracts/docx";
import type { EmailAttachment } from "@/lib/email/send";

/**
 * Builds the unsigned publishing-agreement attachment for the onboarding
 * email, never throwing. pdf-lib's standard fonts throw on characters they
 * can't encode (curly quotes, em-dashes, Yoruba/Igbo diacritics), which are
 * extremely common in real names and titles — so a raw
 * generateUnsignedContractPdf() call would 500 the whole request. Falls back
 * to .docx (no encoding limits), and to no attachment as a last resort, so
 * onboarding always succeeds and the writer still gets their claim/sign link.
 */
export async function buildUnsignedAgreementAttachment(
  contractBody: string,
): Promise<EmailAttachment | null> {
  try {
    const pdf = await generateUnsignedContractPdf(contractBody);
    return { filename: "kekere-publishing-agreement.pdf", content: Buffer.from(pdf) };
  } catch (pdfErr) {
    console.error("Unsigned agreement PDF failed — falling back to .docx:", pdfErr);
    try {
      const docx = await generateUnsignedContractDocx(contractBody);
      return { filename: "kekere-publishing-agreement.docx", content: docx };
    } catch (docxErr) {
      console.error("Unsigned agreement DOCX also failed — sending without attachment:", docxErr);
      return null;
    }
  }
}
