import { Resend } from "resend";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text fallback — always include for accessibility */
  body: string;
  /** Rendered HTML from a React Email template — shown in HTML-capable clients */
  html?: string;
  attachments?: EmailAttachment[];
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "Narriva <hello@narriva.pro>";

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!resend) {
    console.log("[email stub] RESEND_API_KEY not set — would send:", {
      to: message.to,
      subject: message.subject,
      body: message.body,
    });
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: message.to,
      subject: message.subject,
      text: message.body,
      ...(message.html ? { html: message.html } : {}),
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error("[email] Resend error:", error);
    }
  } catch (err) {
    console.error("[email] Failed to send:", (err as Error).message);
  }
}
