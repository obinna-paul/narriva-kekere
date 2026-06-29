import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { generateSignedContractPdf } from "@/lib/contracts/pdf";
import { uploadPortalFile, getPortalFileDownloadUrl } from "@/lib/storage/r2";

export const POST = withAuth(async (request, session, { params }) => {
  const { id } = params as { id: string };

  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      hookLine: true,
      body: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  if (story.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = story.body as { type: string; content: Array<{ type: string; content?: Array<{ text?: string }> }> };
  const paragraphs: string[] = [];
  if (body?.content) {
    for (const node of body.content) {
      if (node.type === "paragraph" && node.content) {
        const text = node.content.map((c) => c.text ?? "").join("");
        paragraphs.push(text);
      }
    }
  }

  const pdfText = `${story.title}\n\n${story.hookLine}\n\nAuthor: ${story.author.name}\nDate: ${new Date().toISOString().split("T")[0]}\n\n---\n\n${paragraphs.join("\n\n")}`;

  const pdfBytes = await generateSignedContractPdf(
    pdfText,
    story.author.name,
    new Date(),
    "export",
  );

  const pdfBuffer = Buffer.from(pdfBytes);
  const ref = await uploadPortalFile(
    pdfBuffer,
    `${story.id}-export.pdf`,
    "application/pdf",
  );

  const downloadUrl = await getPortalFileDownloadUrl(ref);

  return NextResponse.json({ downloadUrl });
});
