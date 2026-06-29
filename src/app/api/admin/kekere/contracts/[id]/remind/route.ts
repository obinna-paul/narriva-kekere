import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

export const POST = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const contract = await prisma.kekereContract.findUnique({
      where: { id },
      include: {
        writer: { select: { name: true, email: true } },
        template: { select: { contractType: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (contract.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending contracts can receive reminders." },
        { status: 400 },
      );
    }

    const hoursSinceSent =
      (Date.now() - contract.sentAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSent < 24) {
      return NextResponse.json(
        { error: "Cannot send more than one reminder per 24 hours." },
        { status: 429 },
      );
    }

    await sendEmail({
      to: contract.writer.email,
      subject: `Reminder: You have a publishing contract from Kekere Stories`,
      body: `Hi ${contract.writer.name},\n\nA ${contract.template.contractType} contract has been waiting for your review since ${contract.sentAt.toISOString().split("T")[0]}. Please log into Kekere Stories and go to your profile to review and sign it before it expires.\n\nIf you have questions, reply to this email or contact support@narriva.com.`,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
