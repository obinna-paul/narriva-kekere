import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const existing = await prisma.nariFaqItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "FAQ item not found" }, { status: 404 });
    }

    let body: {
      question?: string;
      answer?: string;
      keywords?: string[];
      order?: number;
      active?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updated = await prisma.nariFaqItem.update({
      where: { id },
      data: {
        ...(body.question !== undefined ? { question: body.question } : {}),
        ...(body.answer !== undefined ? { answer: body.answer } : {}),
        ...(body.keywords !== undefined ? { keywords: body.keywords } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        question: updated.question,
        answer: updated.answer,
        keywords: updated.keywords,
        order: updated.order,
        active: updated.active,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] },
);

export const DELETE = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const existing = await prisma.nariFaqItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "FAQ item not found" }, { status: 404 });
    }

    await prisma.nariFaqItem.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
