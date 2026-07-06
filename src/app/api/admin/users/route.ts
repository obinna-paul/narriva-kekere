export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["READER", "WRITER", "ADMIN"];

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const roleParam = url.searchParams.get("role");
    const search = url.searchParams.get("search")?.trim() ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));

    const role = VALID_ROLES.includes(roleParam as UserRole)
      ? (roleParam as UserRole)
      : undefined;

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          suspended: true,
          _count: { select: { stories: true, unlocks: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastLoginAt?.toISOString() ?? null,
        suspended: u.suspended,
        storyCount: u._count.stories,
        unlockCount: u._count.unlocks,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
