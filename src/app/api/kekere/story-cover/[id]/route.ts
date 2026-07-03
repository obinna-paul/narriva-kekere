export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { getStoryCoverStream } from "@/lib/storage/r2";

// Cover images are public — no auth. Stable URL cached by browsers for 24h.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    select: { coverImageRef: true },
  });

  if (!story?.coverImageRef) {
    return new Response(null, { status: 404 });
  }

  try {
    const { body, contentType } = await getStoryCoverStream(story.coverImageRef);
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
