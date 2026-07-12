export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { SUPPORT_EMAIL, KEKERE_SUBMISSIONS_FROM, KEKERE_SUBMISSIONS_EMAIL } from "@/lib/constants";

const declineSchema = z.object({
  reason: z.string().optional(),
});

export const POST = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { reason } = parsed.data;

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    include: {
      template: { select: { contractType: true } },
      writer: { select: { name: true, email: true } },
      story: { select: { title: true } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.writerId !== writerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (contract.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending contracts can be declined." },
      { status: 400 },
    );
  }

  const now = new Date();

  await prisma.kekereContract.update({
    where: { id },
    data: {
      status: "DECLINED",
      declinedAt: now,
      declineReason: reason?.trim() ?? null,
    },
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${contract.writer.name} declined a ${contract.template.contractType} contract`,
    body: `Writer: ${contract.writer.name} (${contract.writer.email})\nContract type: ${contract.template.contractType}\nDeclined at: ${now.toISOString()}\nReason: ${reason?.trim() || "Not provided"}`,
  });

  // A warmer note than a dry "you have declined…" — this is an emotional
  // moment for a writer, so it reads like a person wrote it (plain text, no
  // bulk-mail template) and leaves the door wide open without any pressure.
  const storyLabel = contract.story?.title ? `“${contract.story.title}”` : "your story";
  await sendEmail({
    from: KEKERE_SUBMISSIONS_FROM,
    to: contract.writer.email,
    subject: `Sorry to see ${storyLabel} go`,
    body: `Hi ${contract.writer.name},\n\nAh — we were quietly hoping you'd say yes. You've declined the publishing agreement for ${storyLabel}, and that's completely your call. Your story, your rights, always.\n\nWe'll be honest: we're a little sad about it. We don't send an agreement for a story we aren't genuinely excited about, so ${storyLabel} slipping away stings just a bit on our end.\n\nBut there's zero pressure here. If you tapped decline by mistake, if you'd like to talk anything through, or if you simply change your mind next week, next month, or next year — we're one email away at ${KEKERE_SUBMISSIONS_EMAIL}. The door stays wide open.\n\nAnd if this is where we part ways for now: thank you for trusting us with your work long enough to consider it. Please keep writing. Stories like yours are exactly why Kekere exists.\n\nWarmly,\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
  });

  return NextResponse.json({ success: true });
});
