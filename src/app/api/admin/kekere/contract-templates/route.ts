export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const templates = await prisma.kekereContractTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        contractType: true,
        variables: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        contractType: t.contractType,
        variables: t.variables,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);

const createSchema = z.object({
  name: z.string().min(1),
  contractType: z.string().min(1),
  body: z.string().min(1),
  variables: z.array(z.string()),
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

    const template = await prisma.kekereContractTemplate.create({
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      template: { id: template.id, name: template.name },
    });
  },
  { roles: ["ADMIN"] },
);
