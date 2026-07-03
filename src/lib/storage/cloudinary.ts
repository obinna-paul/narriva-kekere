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
