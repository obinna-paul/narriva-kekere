import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const code = await prisma.referralCode.findUnique({ where: { code: params.code } });
  if (!code) {
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set("referral_code", params.code, {
    httpOnly: false,
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
