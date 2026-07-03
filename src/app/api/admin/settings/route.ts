export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const [settings, flags] = await Promise.all([
      prisma.platformSetting.findMany({
        orderBy: { key: "asc" },
        select: { key: true, value: true, description: true, updatedAt: true },
      }),
      prisma.featureFlag.findMany({
        orderBy: { key: "asc" },
        select: { key: true, enabled: true, description: true, updatedAt: true },
      }),
    ]);

    return NextResponse.json({
      settings: settings.map((s) => ({
        key: s.key,
        value: s.value,
        description: s.description,
        updatedAt: s.updatedAt.toISOString(),
      })),
      featureFlags: flags.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        description: f.description,
        updatedAt: f.updatedAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
