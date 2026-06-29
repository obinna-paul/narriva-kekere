import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { renderContractBody } from "@/lib/contracts/render";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";
import type { KekereContractStatus } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as KekereContractStatus | null;
    const writerId = url.searchParams.get("writerId");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

    const where: { status?: KekereContractStatus; writerId?: string } = {};
    if (status) where.status = status;
    if (writerId) where.writerId = writerId;

    const [contracts, total] = await Promise.all([
      prisma.kekereContract.findMany({
        where,
        include: {
          template: { select: { name: true } },
          writer: { select: { name: true, slug: true } },
        },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kekereContract.count({ where }),
    ]);

    const now = Date.now();

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      contracts: contracts.map((c) => ({
        id: c.id,
        templateName: c.template.name,
        writerName: c.writer.name,
        writerSlug: c.writer.slug,
        sentAt: c.sentAt.toISOString(),
        status: c.status,
        signedAt: c.signedAt?.toISOString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        daysUntilExpiry:
          c.status === "PENDING" && c.expiresAt
            ? Math.max(0, Math.ceil((c.expiresAt.getTime() - now) / 86400000))
            : null,
      })),
    });
  },
  { roles: ["ADMIN"] },
);

const sendSchema = z.object({
  templateId: z.string().min(1),
  writerId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
  expiresInDays: z.number().int().min(1).max(365).optional().default(14),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { templateId, writerId, variables, expiresInDays } = parsed.data;

    const template = await prisma.kekereContractTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const rendered = renderContractBody(template.body, variables, template.variables);

    if (rendered.missing) {
      return NextResponse.json(
        { error: "missing_variables", missing: rendered.missing },
        { status: 400 },
      );
    }

    const writer = await prisma.user.findUnique({
      where: { id: writerId },
      select: { name: true, email: true },
    });

    if (!writer) {
      return NextResponse.json({ error: "Writer not found" }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

    const contract = await prisma.kekereContract.create({
      data: {
        templateId,
        writerId,
        body: rendered.rendered!,
        status: "PENDING",
        expiresAt,
        sentAt: now,
      },
    });

    await sendEmail({
      to: writer.email,
      subject: "You have a publishing contract from Kekere Stories",
      body: "A publishing contract has been sent to you. Please log into Kekere Stories and go to your profile to review and sign it.",
    });

    await createNotification({
      userId: writerId,
      type: "CONTRACT_RECEIVED",
      title: "You have a publishing contract",
      body: "Kekere Stories has sent you a publishing contract. Tap to review and sign.",
      link: `/kekere/profile/contracts/${contract.id}`,
    });

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        status: "PENDING",
        expiresAt: contract.expiresAt!.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] },
);
