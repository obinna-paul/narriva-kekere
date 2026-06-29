import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { SUPPORT_EMAIL } from "@/lib/constants";

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

  await sendEmail({
    to: contract.writer.email,
    subject: "You declined your publishing contract",
    body: `Hi ${contract.writer.name},\n\nYou have declined the ${contract.template.contractType} publishing contract sent to you on ${contract.sentAt.toISOString().split("T")[0]}. If this was a mistake or you'd like to discuss, please contact support@narriva.com.`,
  });

  return NextResponse.json({ success: true });
});
