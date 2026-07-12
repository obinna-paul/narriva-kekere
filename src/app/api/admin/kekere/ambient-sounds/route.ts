export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getAmbientSoundUploadUrl } from "@/lib/storage/r2";
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
 * Mints a presigned R2 upload URL rather than accepting the file body here.
 * Routing the raw audio bytes through this Next.js route would count against
 * the hosting platform's own serverless request-body size limit (a few MB on
 * most platforms) regardless of the MAX_BYTES check below — a real audio
 * file could get rejected by the platform before this code ever runs. The
 * browser instead PUTs the file straight to R2 using the returned URL.
 */
export const POST = withAuth(
  async (request, session) => {
    let body: { title?: string; filename?: string; contentType?: string; size?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Missing 'title' field" }, { status: 400 });
    }

    const filename = String(body.filename ?? "");
    if (!filename) {
      return NextResponse.json({ error: "Missing 'filename' field" }, { status: 400 });
    }

    const contentType = resolveContentType(String(body.contentType ?? ""), filename);
    if (!contentType) {
      return NextResponse.json(
        { error: `Unsupported file. Use one of: ${Object.keys(EXTENSION_CONTENT_TYPES).join(", ")}` },
        { status: 400 },
      );
    }

    if (typeof body.size === "number" && body.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio must be under 50 MB" }, { status: 400 });
    }

    const maxOrder = await prisma.ambientSound.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Create first to get an id, then key the upload off that id — matches
    // the uploadStoryCover pattern where the object key is deterministic per
    // row. Left with a valid audioRef immediately (before the browser has
    // actually uploaded anything) since the key is fully deterministic; if
    // the browser-side PUT never completes, the admin UI deletes this row.
    const sound = await prisma.ambientSound.create({
      data: { title, audioRef: "", order: nextOrder },
    });
    const { key, uploadUrl } = await getAmbientSoundUploadUrl(sound.id, contentType);
    await prisma.ambientSound.update({ where: { id: sound.id }, data: { audioRef: key } });

    await logAdminAction(session.user.id, session.user.id, "ADD_AMBIENT_SOUND", {
      ambientSoundId: sound.id,
      title: sound.title,
    });

    return NextResponse.json({
      success: true,
      soundId: sound.id,
      uploadUrl,
      contentType,
    });
  },
  { roles: ["ADMIN"] },
);
