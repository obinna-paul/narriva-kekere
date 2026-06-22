export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Stub — real email sending (Resend/SES/whatever) is Phase 17. For now this
 * just logs what would be sent, so the submission flow has somewhere to call
 * without blocking on infrastructure that doesn't exist yet.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  console.log("[email stub] Would send email:", {
    to: message.to,
    subject: message.subject,
    body: message.body,
  });
}
