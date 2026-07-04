export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { v2 as cloudinary } from "cloudinary";
import { createId } from "@paralleldrive/cuid2";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const POST = withAuth(
  async (request) => {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use a provided storyId or generate a placeholder id for the public_id
    const storyId = (formData.get("storyId") as string | null) ?? createId();
    const publicId = `kekere-covers/${storyId}`;

    const result = await new Promise<{ version: number; secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { public_id: publicId, overwrite: true, invalidate: true, resource_type: "image" },
            (err, result) => {
              if (err || !result) return reject(err ?? new Error("Upload failed"));
              resolve(result as { version: number; secure_url: string });
            },
          )
          .end(buffer);
      },
    );

    // Store the versioned ref so the CDN URL is always unique
    const coverImageRef = `v${result.version}/${publicId}`;

    return NextResponse.json({ coverImageRef, previewUrl: result.secure_url });
  },
  { roles: ["ADMIN"] },
);
