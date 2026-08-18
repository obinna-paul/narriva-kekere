export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { sendEmail } from "@/lib/email/send";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";
import { OWNER_EMAIL } from "@/content/decisions";

/**
 * Is the app's email actually leaving the building? The whole app sends
 * through one Resend pipeline from @narriva.pro addresses — so when OTP
 * codes or password-reset links don't arrive, the question is always the
 * same: is Resend accepting the send, rejecting it (domain not verified,
 * quota), or is the key missing entirely (which makes sends a silent no-op)?
 *
 * This does a real test send to the caller's own address and returns
 * Resend's exact verdict, so that answer is visible from the browser instead
 * of buried in Vercel logs. Super-admin only (same gate as role changes),
 * and it can ONLY send to the caller's own email — never an arbitrary
 * recipient — so it can't be turned into a spam relay.
 */
export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", OWNER_EMAIL);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });
    if (!me) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const keyPresent = Boolean(process.env.RESEND_API_KEY);

    const result = await sendEmail({
      to: me.email,
      subject: "Kekere email diagnostics — test send",
      body: `Hi ${me.name},\n\nThis is a diagnostic test email from Kekere Stories. If you received it, outbound email is working — the sending domain is verified and Resend delivered it.\n\nSent at ${new Date().toISOString()}.`,
      from: KEKERE_GENERAL_FROM,
    });

    // A note on interpretation, so the JSON reads on its own:
    // - accepted:true, keyPresent:true  -> Resend took it. If it still never
    //   arrives, it's delivery-side (spam / reputation) — check the Resend
    //   Emails log for the final status.
    // - accepted:true, providerError "no_api_key" -> the key is NOT set on
    //   this deployment, so every send is a silent no-op. Nothing is going
    //   out at all. Set RESEND_API_KEY in Vercel.
    // - accepted:false -> Resend rejected it; providerError is the verbatim
    //   reason (very often "domain is not verified").
    return NextResponse.json({
      sentTo: me.email,
      from: KEKERE_GENERAL_FROM,
      resendApiKeyPresent: keyPresent,
      accepted: result.success,
      providerError: result.providerError ?? null,
    });
  },
  { roles: ["ADMIN"] },
);
