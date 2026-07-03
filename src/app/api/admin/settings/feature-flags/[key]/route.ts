export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { invalidateFlagCache } from "@/lib/settings/get";

const ALLOWED_FLAGS = [
  "cowrie_withdrawals",
  "story_submissions",
  "manuscript_submissions",
  "referral_program",
];

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { key } = params as { key: string };

    if (!ALLOWED_FLAGS.includes(key)) {
      return NextResponse.json(
        { error: `Flag "${key}" is not allowed. Allowed flags: ${ALLOWED_FLAGS.join(", ")}` },
        { status: 400 },
      );
    }

    let body: { enabled?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required." }, { status: 400 });
    }

    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: { enabled: body.enabled },
      create: { key, enabled: body.enabled, description: `Admin-managed feature flag for ${key}` },
    });

    invalidateFlagCache(key);

    return NextResponse.json({
      success: true,
      flag: {
        key: flag.key,
        enabled: flag.enabled,
        updatedAt: flag.updatedAt.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] },
);
