export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { uploadUserAvatar } from "@/lib/storage/r2";
import { updateUserAvatar } from "@/lib/data/kekere-profile-stats";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const POST = withAuth(async (request, session) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'image' field" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type. Use: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const avatarKey = await uploadUserAvatar(session.user.id, buffer, file.type);
  await updateUserAvatar(session.user.id, avatarKey);

  // Cache-bust: the public serving URL is otherwise stable per userId, so a
  // re-upload wouldn't show up until the browser's 24h cache expired.
  return NextResponse.json({ avatarUrl: `/api/kekere/avatar/${session.user.id}?v=${Date.now()}` });
});
