import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const contract = await prisma.kekereContract.findUnique({
      where: { id },
      include: {
        template: { select: { name: true, contractType: true } },
        writer: { select: { name: true, email: true, slug: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: contract.id,
      templateId: contract.templateId,
      templateName: contract.template.name,
      contractType: contract.template.contractType,
      writerId: contract.writerId,
      writerName: contract.writer.name,
      writerEmail: contract.writer.email,
      writerSlug: contract.writer.slug,
      body: contract.body,
      status: contract.status,
      signedName: contract.signedName,
      signedAt: contract.signedAt?.toISOString() ?? null,
      signerIp: contract.signerIp,
      signedPdfRef: contract.signedPdfRef,
      declinedAt: contract.declinedAt?.toISOString() ?? null,
      declineReason: contract.declineReason,
      expiresAt: contract.expiresAt?.toISOString() ?? null,
      sentAt: contract.sentAt.toISOString(),
    });
  },
  { roles: ["ADMIN"] },
);
