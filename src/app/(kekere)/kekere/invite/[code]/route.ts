import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/middleware";

const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const code = await prisma.referralCode.findUnique({ where: { code: params.code } });
  if (!code) {
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }

  const story = new URL(request.url).searchParams.get("story");
  const storyPath = story ? `/kekere/story/${story}` : null;

  // Already signed in — this is a returning reader, not someone to register
  // a referral for (that only ever happens at signup). Send them straight to
  // the shared story instead of bouncing through the login screen.
  const session = await getCurrentSession();
  if (session?.user?.id) {
    return NextResponse.redirect(new URL(storyPath ?? "/kekere/feed", request.url));
  }

  const loginUrl = new URL("/login", request.url);
  if (storyPath) {
    loginUrl.searchParams.set("callbackUrl", storyPath);
    // A story invite is most often clicked by someone without an account
    // yet — default to the signup tab; an existing reader can still switch
    // to "Sign in" with one tap.
    loginUrl.searchParams.set("mode", "signup");
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("referral_code", params.code, {
    httpOnly: false,
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
