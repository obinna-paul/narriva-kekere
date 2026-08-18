export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordReset } from "@/lib/auth/reset-password";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Always succeeds — never reveal whether the email exists. That contract
  // held for "no such user" (createPasswordReset already returns silently),
  // but not for an unexpected failure (a DB blip, an email-provider error) —
  // those propagated to a raw 500, breaking the same privacy guarantee (a
  // failed request is itself a signal) and showing every caller, regardless
  // of role, a scary "Something went wrong" for what's usually transient.
  // Caught and logged instead: the reader still sees the same calm
  // "check your email" response, and the real error is still visible
  // server-side for us to chase.
  try {
    await createPasswordReset(parsed.data.email);
  } catch (err) {
    console.error("[forgot-password] createPasswordReset failed:", err);
  }

  return NextResponse.json({ success: true });
}
