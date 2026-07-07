import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";

/**
 * Uploads a story cover image. The public_id is deterministic so re-uploading
 * overwrites the previous cover rather than leaving orphaned files.
 * Returns the public_id to store in Story.coverImageRef.
 */
export async function uploadStoryCover(
  storyId: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const publicId = `kekere-covers/${storyId}`;

  await new Promise<void>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        format: contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve();
      },
    );
    stream.end(buffer);
  });

  return publicId;
}

/** Constructs the optimised Cloudinary CDN URL for a story cover.
 *  Auto format + quality, cropped to 3:4 portrait at 2× resolution. */
export function storyCoverUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_280,h_373,c_fill/${publicId}`;
}

/**
 * Uploads a user's profile photo. The client already cropped this to a
 * square before calling us (see avatar-crop-modal.tsx), so this is mostly
 * just optimisation — but `c_fill` is kept as a safety net in case a future
 * caller ever sends a non-square image. Returns a versioned ref
 * ("v<version>/kekere-avatars/<userId>") rather than the bare public_id:
 * Cloudinary's CDN caches aggressively by URL, and re-uploading to the same
 * deterministic public_id (someone changing their photo again) would
 * otherwise keep serving the stale cached image until the version segment
 * in the URL changes.
 */
export async function uploadUserAvatar(
  userId: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const publicId = `kekere-avatars/${userId}`;

  const result = await new Promise<{ version: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        format: contentType === "image/png" ? "png" : "jpg",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error ?? new Error("Upload failed"));
        else resolve(uploadResult as { version: number });
      },
    );
    stream.end(buffer);
  });

  return `v${result.version}/${publicId}`;
}

/** Constructs the optimised Cloudinary CDN URL for a user's avatar. */
export function userAvatarUrl(ref: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_200,h_200,c_fill/${ref}`;
}
