export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const items = await prisma.nariFaqItem.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        question: i.question,
        answer: i.answer,
        keywords: i.keywords,
        order: i.order,
        active: i.active,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);

const createSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.array(z.string()),
  order: z.number().int().optional().default(0),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const item = await prisma.nariFaqItem.create({
      data: {
        question: parsed.data.question,
        answer: parsed.data.answer,
        keywords: parsed.data.keywords,
        order: parsed.data.order,
      },
    });

    return NextResponse.json({ success: true, item: { id: item.id, question: item.question } });
  },
  { roles: ["ADMIN"] },
);
