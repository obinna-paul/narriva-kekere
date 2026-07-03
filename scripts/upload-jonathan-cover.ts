/**
 * Uploads the cover image for Jonathan and updates Story.coverImageRef.
 * Run: node --env-file=.env -e "require('tsx/cjs'); require('./scripts/upload-jonathan-cover.ts')"
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

const STORY_ID = "cmr3n0ued00072quefivadhsr";
const COVER_PATH = "C:/Users/HP/Downloads/Generated Image July 02, 2026 - 2_29PM.jpg";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const absPath = path.resolve(COVER_PATH);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Cover image not found: ${absPath}`);
  }

  const publicId = `kekere-covers/${STORY_ID}`;

  console.log(`Uploading ${buffer.length} bytes to Cloudinary public_id: ${publicId}`);

  const result = await cloudinary.uploader.upload(absPath, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });

  console.log(`Uploaded: ${result.secure_url}`);

  await prisma.story.update({
    where: { id: STORY_ID },
    data: { coverImageRef: publicId },
  });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  console.log(`Done. coverImageRef = ${publicId}`);
  console.log(`CDN URL: https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_280,h_373,c_fill/${publicId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
