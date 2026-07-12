export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { uploadAmbientSound } from "@/lib/storage/r2";
import { logAdminAction } from "@/lib/admin/logAction";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/x-m4a"];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — a few minutes of a loopable ambient track

export const GET = withAuth(
  async () => {
    const sounds = await prisma.ambientSound.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      sounds: sounds.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        active: s.active,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);

export const POST = withAuth(
  async (request, session) => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Missing 'title' field" }, { status: 400 });
    }

    const file = formData.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'audio' field" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type. Use: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Audio must be under 20 MB" }, { status: 400 });
    }

    const maxOrder = await prisma.ambientSound.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Create first to get an id, then upload keyed by that id — matches the
    // uploadStoryCover pattern where the object key is deterministic per row.
    const created = await prisma.ambientSound.create({
      data: { title, audioRef: "", order: nextOrder },
    });
    const audioRef = await uploadAmbientSound(created.id, buffer, file.type);
    const sound = await prisma.ambientSound.update({
      where: { id: created.id },
      data: { audioRef },
    });

    await logAdminAction(session.user.id, session.user.id, "ADD_AMBIENT_SOUND", {
      ambientSoundId: sound.id,
      title: sound.title,
    });

    return NextResponse.json({
      success: true,
      sound: { id: sound.id, title: sound.title, order: sound.order, active: sound.active },
    });
  },
  { roles: ["ADMIN"] },
);
