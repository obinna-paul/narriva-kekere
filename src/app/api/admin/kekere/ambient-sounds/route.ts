export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { uploadAmbientSound } from "@/lib/storage/r2";
import { logAdminAction } from "@/lib/admin/logAction";

// Browsers report wildly inconsistent MIME types for audio files (varies by
// OS, browser, and codec — some report nothing at all), so this can't be a
// strict allowlist gate on its own. It's paired with an extension-based
// fallback below for exactly that reason.
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/ogg",
  "application/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
];
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/x-m4a",
  aac: "audio/aac",
  flac: "audio/flac",
  webm: "audio/webm",
  mp4: "audio/mp4",
};
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — comfortable headroom for a longer/higher-bitrate loop

function extensionOf(filename: string): string | undefined {
  return filename.split(".").pop()?.toLowerCase();
}

/** Prefers the browser-reported type when it's one we recognize; falls back
 *  to the file extension when the browser reports nothing usable (common
 *  across OS/browser combos for audio files) — returns undefined if neither
 *  is a supported audio file. */
function resolveContentType(reportedType: string, filename: string): string | undefined {
  if (ALLOWED_TYPES.includes(reportedType)) return reportedType;
  const ext = extensionOf(filename);
  return ext ? EXTENSION_CONTENT_TYPES[ext] : undefined;
}

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

/**
 * Accepts the audio file as a multipart body and uploads it to R2 from the
 * server. Deliberately NOT a presigned direct browser->R2 upload: that would
 * require CORS configuration on the R2 bucket (a cross-origin PUT from the
 * app to *.r2.cloudflarestorage.com), which fails with an opaque "Failed to
 * fetch" until someone sets it up. Routing through our own origin needs no
 * such config. The real R2-upload blocker was the SDK's default checksum
 * headers, fixed in the S3Client config in src/lib/storage/r2.ts.
 */
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

    const contentType = resolveContentType(file.type, file.name);
    if (!contentType) {
      return NextResponse.json(
        { error: `Unsupported file. Use one of: ${Object.keys(EXTENSION_CONTENT_TYPES).join(", ")}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Audio must be under 50 MB" }, { status: 400 });
    }

    const maxOrder = await prisma.ambientSound.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Create first to get an id, then upload keyed by that id — matches the
    // uploadStoryCover pattern where the object key is deterministic per row.
    const created = await prisma.ambientSound.create({
      data: { title, audioRef: "", order: nextOrder },
    });

    let audioRef: string;
    try {
      audioRef = await uploadAmbientSound(created.id, buffer, contentType);
    } catch (err) {
      // Don't leave a row pointing at a file that never landed.
      await prisma.ambientSound.delete({ where: { id: created.id } }).catch(() => {});
      const detail = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `Storage upload failed: ${detail}` }, { status: 502 });
    }

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
