import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/** GET /api/kekere/tags — returns all system-registered tags for admin pickers. */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { label: "asc" },
      select: { id: true, slug: true, label: true },
    });
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
