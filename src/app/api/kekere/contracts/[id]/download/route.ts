import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getPortalFileDownloadUrl } from "@/lib/storage/r2";

export const GET = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    select: {
      writerId: true,
      status: true,
      signedPdfRef: true,
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.writerId !== writerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (contract.status !== "SIGNED" || !contract.signedPdfRef) {
    return NextResponse.json(
      { error: "No signed PDF available. The contract has not been signed yet." },
      { status: 400 },
    );
  }

  const downloadUrl = await getPortalFileDownloadUrl(contract.signedPdfRef);

  return NextResponse.json({ downloadUrl });
});
