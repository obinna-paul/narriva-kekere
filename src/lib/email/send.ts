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
  /** Overrides the default sender identity, e.g. a personal note from the CEO */
  from?: string;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "Narriva <hello@narriva.pro>";

export interface SendEmailResult {
  success: boolean;
  /** Set when success is false — safe to show a user, never the raw Resend error. */
  error?: string;
}

/**
 * Most callers fire-and-forget this (a failed notification shouldn't block
 * the underlying action, e.g. a withdrawal still completes even if the
 * confirmation email fails) — that's fine, the promise still resolves. But
 * callers where the email IS the deliverable (e.g. "email me my full
 * transaction history") must check the returned `success` flag instead of
 * assuming delivery — this used to swallow every Resend failure into a
 * console.error, so a user could be told "Sent!" for an email that never
 * left the building.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (!resend) {
    console.log("[email stub] RESEND_API_KEY not set — would send:", {
      to: message.to,
      subject: message.subject,
      body: message.body,
    });
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: message.from ?? FROM,
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
      return { success: false, error: "Couldn't send the email — please try again." };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", (err as Error).message);
    return { success: false, error: "Couldn't send the email — please try again." };
  }
}
