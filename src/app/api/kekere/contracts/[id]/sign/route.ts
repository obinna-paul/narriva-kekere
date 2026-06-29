import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { generateSignedContractPdf } from "@/lib/contracts/pdf";
import { getPortalFileDownloadUrl, uploadPortalFile } from "@/lib/storage/r2";
import { sendEmail } from "@/lib/email/send";
import { SUPPORT_EMAIL } from "@/lib/constants";

const signSchema = z.object({
  signedName: z.string().min(1, "Signed name is required."),
});

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const POST = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { signedName } = parsed.data;

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
      { error: "Only pending contracts can be signed." },
      { status: 400 },
    );
  }

  const now = Date.now();
  if (contract.expiresAt && contract.expiresAt.getTime() < now) {
    await prisma.kekereContract.update({
      where: { id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ error: "contract_expired" }, { status: 400 });
  }

  const signedAt = new Date();
  const signerIp = getClientIp(request);

  const pdfBytes = await generateSignedContractPdf(
    contract.body,
    signedName,
    signedAt,
    signerIp,
  );

  const pdfBuffer = Buffer.from(pdfBytes);
  const pdfRef = await uploadPortalFile(pdfBuffer, `contract-${id}.pdf`, "application/pdf");

  await prisma.kekereContract.update({
    where: { id },
    data: {
      status: "SIGNED",
      signedName,
      signedAt,
      signerIp,
      signedPdfRef: pdfRef,
    },
  });

  const downloadUrl = await getPortalFileDownloadUrl(pdfRef);

  await sendEmail({
    to: contract.writer.email,
    subject: "Your contract is signed",
    body: "Your contract is signed. Download a copy from your profile.",
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${contract.writer.name} has signed a ${contract.template.contractType} contract`,
    body: `Writer: ${contract.writer.name} (${contract.writer.email})\nContract type: ${contract.template.contractType}\nSigned at: ${signedAt.toISOString()}`,
  });

  return NextResponse.json({ success: true, downloadUrl });
});
