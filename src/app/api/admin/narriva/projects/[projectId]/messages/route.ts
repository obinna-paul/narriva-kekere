import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(
  async (request, session, { params }) => {
    const { projectId } = params as { projectId: string };

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let body: { body?: string; isInternal?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const messageBody = body.body?.trim();

    if (!messageBody) {
      return NextResponse.json(
        { error: "Message body is required." },
        { status: 400 }
      );
    }

    await prisma.projectMessage.create({
      data: {
        projectId,
        authorId: session.user.id,
        authorRole: "Admin",
        body: messageBody,
        isInternal: body.isInternal === true,
      },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
