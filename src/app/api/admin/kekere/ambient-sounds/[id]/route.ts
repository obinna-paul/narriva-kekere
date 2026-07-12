export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { deleteAmbientSound } from "@/lib/storage/r2";
import { logAdminAction } from "@/lib/admin/logAction";

export const PATCH = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    const existing = await prisma.ambientSound.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ambient sound not found" }, { status: 404 });
    }

    let body: { title?: string; order?: number; active?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: { title?: string; order?: number; active?: boolean } = {};
    if (typeof body.title === "string") {
      const trimmed = body.title.trim();
      if (!trimmed) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      data.title = trimmed;
    }
    if (typeof body.order === "number" && Number.isFinite(body.order)) {
      data.order = body.order;
    }
    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const sound = await prisma.ambientSound.update({ where: { id }, data });

    await logAdminAction(session.user.id, session.user.id, "UPDATE_AMBIENT_SOUND", {
      ambientSoundId: id,
      changes: data,
    });

    return NextResponse.json({
      success: true,
      sound: { id: sound.id, title: sound.title, order: sound.order, active: sound.active },
    });
  },
  { roles: ["ADMIN"] },
);

export const DELETE = withAuth(
  async (_request, session, { params }) => {
    const { id } = params as { id: string };

    const existing = await prisma.ambientSound.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ambient sound not found" }, { status: 404 });
    }

    await prisma.ambientSound.delete({ where: { id } });
    await deleteAmbientSound(existing.audioRef).catch(() => {});

    await logAdminAction(session.user.id, session.user.id, "DELETE_AMBIENT_SOUND", {
      ambientSoundId: id,
      title: existing.title,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
