export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validation/contact";
import { sendEmail } from "@/lib/email/send";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = parsed.data;

  await sendEmail({
    to: "hello@narriva.com",
    subject: `[Contact] ${subject} — ${name}`,
    body: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
