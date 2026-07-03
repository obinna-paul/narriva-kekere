export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const template = await prisma.kekereContractTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      contractType: template.contractType,
      body: template.body,
      variables: template.variables,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  },
  { roles: ["ADMIN"] },
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contractType: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const existing = await prisma.kekereContractTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.kekereContractTemplate.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      template: { id: updated.id, name: updated.name },
    });
  },
  { roles: ["ADMIN"] },
);

export const DELETE = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const template = await prisma.kekereContractTemplate.findUnique({
      where: { id },
      include: { contracts: { select: { id: true } } },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.contracts.length > 0) {
      return NextResponse.json(
        {
          error: "template_in_use",
          message: "Cannot delete a template that has been used for contracts.",
        },
        { status: 400 },
      );
    }

    await prisma.kekereContractTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
