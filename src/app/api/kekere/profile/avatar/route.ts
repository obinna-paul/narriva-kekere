export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { uploadUserAvatar, userAvatarUrl } from "@/lib/storage/cloudinary";
import { updateUserAvatar } from "@/lib/data/kekere-profile-stats";

// The client always sends an already-cropped, canvas-exported image (see
// avatar-crop-modal.tsx), so this is really just a sanity check, not the
// primary format gate — the canvas export controls the real content-type.
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

  try {
    const avatarRef = await uploadUserAvatar(session.user.id, buffer, file.type);
    await updateUserAvatar(session.user.id, avatarRef);
    return NextResponse.json({ avatarUrl: userAvatarUrl(avatarRef) });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
});
