export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { getUserAvatarStream } from "@/lib/storage/r2";

// Avatars are public — no auth. Stable URL cached by browsers for 24h.
export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { avatar: true },
  });

  if (!user?.avatar) {
    return new Response(null, { status: 404 });
  }

  try {
    const { body, contentType } = await getUserAvatarStream(user.avatar);
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
