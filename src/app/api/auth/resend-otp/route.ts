export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { resendOtp } from "@/lib/auth/verify-email";

const resendSchema = z.object({
  email: z.string().email(),
  brand: z.enum(["kekere", "narriva"]).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, brand } = parsed.data;

  const result = await resendOtp(email, brand);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
