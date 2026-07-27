export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { issueWriterInvite } from "@/lib/data/kekere-writer-invites";

const schema = z.object({
  /** Default true. False is "give me a fresh link without emailing" — the
   *  admin UI only sends that after an explicit confirmation, because it
   *  invalidates the link the writer may already be holding. */
  sendEmail: z.boolean().optional(),
});

/**
 * Issues a writer's publishing-agreement invitation.
 *
 * Replaces the old regenerate-claim and resend-email pair. Those minted claim
 * tokens independently of each other, and since only the hash is stored, each
 * one silently killed the last — including the link the admin had already
 * sent by hand. One endpoint, one token, one URL that is always the one in
 * the writer's inbox.
 */
export const POST = withAuth(
  async (request, _session, { params }) => {
    const { writerId } = params as { writerId: string };

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body ?? {});
    const sendInviteEmail = parsed.success ? parsed.data.sendEmail ?? true : true;

    const result = await issueWriterInvite({ writerId, sendInviteEmail });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      // Named actionUrl, not claimUrl: for a writer who already has a login
      // this is their in-app contracts page, not a claim link at all.
      actionUrl: result.actionUrl,
      emailed: result.emailed,
      isClaimLink: result.isClaimLink,
    });
  },
  { roles: ["ADMIN"] },
);
