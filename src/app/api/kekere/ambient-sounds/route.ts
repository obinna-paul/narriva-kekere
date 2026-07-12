export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAmbientSoundUrl } from "@/lib/storage/r2";

/**
 * Public — the reader's headphone menu needs this whether or not the reader
 * is logged in (background white noise isn't gated behind cowries). Signed
 * URLs are minted fresh on every call rather than cached, so they're always
 * good for a full session even if the list is fetched well after page load.
 */
export async function GET() {
  const sounds = await prisma.ambientSound.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const withUrls = await Promise.all(
    sounds.map(async (s) => ({
      id: s.id,
      title: s.title,
      url: await getAmbientSoundUrl(s.audioRef),
    })),
  );

  return NextResponse.json({ sounds: withUrls });
}
