export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPasswordReset } from "@/lib/auth/reset-password";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
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
    const msg = parsed.error.flatten().fieldErrors.password?.[0]
      ?? "Invalid request.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await applyPasswordReset(parsed.data.token, parsed.data.password);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // An expired/invalid token already returns a clean {error} above without
    // throwing — this is only an unexpected infra failure. Surfaced as a
    // retryable message rather than a raw 500, so "reset whenever they want"
    // holds even through a transient blip.
    console.error("[reset-password] applyPasswordReset failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 500 },
    );
  }
}
