export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { signContractAndPublishStory } from "@/lib/data/kekere-contracts";
import { getPortalFileDownloadUrl } from "@/lib/storage/r2";

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

/**
 * The writer-facing sign action from the in-app Contracts inbox. All the
 * actual signing logic (PDF/DOCX generation, the onboarded-vs-regular-writer
 * publish branch, emails, notifications) lives in signContractAndPublishStory
 * — shared with the claim-account flow so both paths can never diverge again.
 * This route only owns what's specific to being an authenticated in-app
 * request: verifying the signer owns the contract, and turning the
 * resulting pdfRef into a downloadUrl for the immediate post-sign UI state.
 */
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

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    select: { writerId: true, status: true },
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

  let result;
  try {
    result = await signContractAndPublishStory({
      contractId: id,
      signedName: parsed.data.signedName,
      signerIp: getClientIp(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    if (message === "Contract has expired") {
      return NextResponse.json({ error: "contract_expired" }, { status: 400 });
    }
    if (message === "Only pending contracts can be signed") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  const downloadUrl = result.pdfRef ? await getPortalFileDownloadUrl(result.pdfRef).catch(() => null) : null;

  return NextResponse.json({ success: true, downloadUrl });
});
