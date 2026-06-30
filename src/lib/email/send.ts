import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
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
    });

    if (error) {
      console.error("[email] Resend error:", error);
    }
  } catch (err) {
    console.error("[email] Failed to send:", (err as Error).message);
  }
}
