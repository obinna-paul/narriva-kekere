import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()),
});

export const PUT = withAuth(
  async (request) => {
    const body = await request.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { orderedIds } = parsed.data;

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.nariFaqItem.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
