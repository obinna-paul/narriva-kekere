export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getAmbientSoundUploadUrl, ensureUploadCorsConfigured } from "@/lib/storage/r2";
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
 * Mints a presigned R2 upload URL — the browser PUTs the file straight to R2
 * rather than sending it through this route. A multipart upload through here
 * would be rejected by the hosting platform's request-body size limit (often
 * 1–4.5 MB) before our code even runs, surfacing as a generic upload failure
 * for any real-sized audio file. Also best-effort configures the bucket CORS
 * policy so the cross-origin browser PUT is allowed.
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

    // Best-effort: make sure the bucket allows cross-origin browser PUTs. If
    // the R2 token lacks permission to set CORS this throws — we don't fail
    // the request over it (the PUT may still work if CORS was set manually),
    // but we surface a clear hint so the cause isn't a mystery.
    let corsWarning: string | undefined;
    try {
      await ensureUploadCorsConfigured();
    } catch (err) {
      corsWarning = err instanceof Error ? err.message : "could not auto-configure bucket CORS";
    }

    const maxOrder = await prisma.ambientSound.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Create the row, then key the upload off its id. The browser uploads
    // next; if that PUT never completes the admin UI deletes this row.
    const sound = await prisma.ambientSound.create({
      data: { title, audioRef: "", order: nextOrder },
    });

    let uploadUrl: string;
    let key: string;
    try {
      ({ key, uploadUrl } = await getAmbientSoundUploadUrl(sound.id, contentType));
    } catch (err) {
      await prisma.ambientSound.delete({ where: { id: sound.id } }).catch(() => {});
      const detail = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `Could not prepare upload: ${detail}` }, { status: 502 });
    }

    await prisma.ambientSound.update({ where: { id: sound.id }, data: { audioRef: key } });

    await logAdminAction(session.user.id, session.user.id, "ADD_AMBIENT_SOUND", {
      ambientSoundId: sound.id,
      title: sound.title,
    });

    return NextResponse.json({ success: true, soundId: sound.id, uploadUrl, contentType, corsWarning });
  },
  { roles: ["ADMIN"] },
);
