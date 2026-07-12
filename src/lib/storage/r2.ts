import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 is S3-compatible, so the AWS SDK works against it directly —
 * just point the endpoint at the account-specific R2 URL (the
 * CLOUDFLARE_R2_* env vars were already stubbed in .env.example back in
 * Phase 1; this is the first phase that actually uses them). Manuscripts are
 * private (not a public bucket): we store the object key as
 * NarrivaSubmission.manuscriptRef and mint short-lived signed URLs for the
 * admin review queue rather than exposing a permanent public link.
 */
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT ?? "",
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  },
  // AWS SDK v3 >= 3.729 defaults requestChecksumCalculation to
  // "WHEN_SUPPORTED", which stamps an x-amz-checksum-crc32 header on every
  // PutObject. Cloudflare R2 rejects/ misbehaves on those checksum headers
  // (and it breaks presigned PUT URLs, where the checksum is signed over an
  // empty body and then never matches the real upload). Forcing both to
  // WHEN_REQUIRED restores the pre-3.729 behaviour that R2 expects — none of
  // our operations actually require a checksum. This is the single most
  // likely reason R2 uploads were failing after the SDK bump.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET ?? "";

export async function uploadManuscript(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `submissions/${crypto.randomUUID()}-${filename}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

/** Short-lived signed download URL for the admin submissions queue. */
export async function getManuscriptDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 10 }
  );
}

/** Signed download URL for author portal files (deliverables, documents).
 *  Expires in 15 minutes. */
export async function getPortalFileDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 15 }
  );
}

/** Uploads a deliverable or document file to the portal/ prefix in R2.
 *  Returns the object key stored in the database. */
export async function uploadPortalFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `portal/${crypto.randomUUID()}-${filename}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

export interface EbookChapter {
  index: number;
  title: string;
  body: string;
}

export interface EbookContent {
  title: string;
  chapterCount: number;
  chapters: EbookChapter[];
}

/** Fetches and parses ebook content from R2. Content is stored as structured
 * JSON — never returned as a downloadable file. */
export async function getEbookContent(key: string): Promise<EbookContent> {
  const response = await r2Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );

  if (!response.Body) {
    throw new Error("Ebook content not found");
  }

  const text = await response.Body.transformToString("utf-8");
  return JSON.parse(text) as EbookContent;
}

/** Uploads structured ebook JSON to R2, keyed by book id. Overwrites any
 * existing content at that key — re-uploading is how an admin corrects a
 * book's content after the fact. */
export async function uploadEbookJson(bookId: string, content: EbookContent): Promise<string> {
  const key = `ebooks/${bookId}.json`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(content),
      ContentType: "application/json",
    })
  );

  return key;
}

/** Uploads a story cover image. Key is deterministic so re-uploading replaces
 *  the previous cover rather than leaving orphaned files. */
export async function uploadStoryCover(
  storyId: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `story-covers/${storyId}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }),
  );

  return key;
}

/** Streams a story cover image from R2. Used by the public cover-serving route
 *  so browsers get a stable URL they can cache. */
export async function getStoryCoverStream(
  key: string,
): Promise<{ body: ReadableStream; contentType: string }> {
  const res = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error("Cover not found");
  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? "image/jpeg",
  };
}


/** Fetches a single chapter from ebook content in R2. */
export async function getEbookChapter(
  key: string,
  chapterIndex: number
): Promise<EbookChapter | null> {
  const content = await getEbookContent(key);
  return content.chapters.find((c) => c.index === chapterIndex) ?? null;
}

/** Uploads generated TTS narration audio for a story. Overwrites any
 * existing file at the same key — re-generation (Phase B6) replaces the
 * old audio rather than accumulating orphaned files. */
export async function uploadStoryAudio(storyId: string, buffer: Buffer): Promise<string> {
  const key = `audio/stories/${storyId}.mp3`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "audio/mpeg",
    })
  );

  return key;
}

/** Signed playback URL for a story's narration audio — long enough for a
 * full reading/listening session, short enough to deter link sharing. */
export async function getStoryAudioUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 4 }
  );
}

function ambientSoundKey(id: string, contentType: string): string {
  const ext = contentType === "audio/wav" || contentType === "audio/x-wav" || contentType === "audio/wave" || contentType === "audio/vnd.wave" ? "wav"
    : contentType === "audio/ogg" || contentType === "application/ogg" ? "ogg"
    : contentType === "audio/mp4" || contentType === "audio/x-m4a" ? "m4a"
    : contentType === "audio/aac" ? "aac"
    : contentType === "audio/flac" || contentType === "audio/x-flac" ? "flac"
    : contentType === "audio/webm" ? "webm"
    : "mp3";
  return `audio/ambient/${id}.${ext}`;
}

/** Server-side upload of an ambient loop. Kept for parity with the other
 *  R2 helpers, but the admin UI uploads via getAmbientSoundUploadUrl instead:
 *  routing the file bytes through our own server hits the hosting platform's
 *  request-body size limit (often 1–4.5 MB) before our code runs, which
 *  surfaces as a generic upload failure for any real-sized audio file. */
export async function uploadAmbientSound(
  id: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const key = ambientSoundKey(id, contentType);

  await r2Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }),
  );

  return key;
}

/** Presigned PUT URL so the admin's browser uploads the audio straight to R2,
 *  bypassing our server entirely (and therefore any platform request-body
 *  limit). The S3Client's requestChecksumCalculation is WHEN_REQUIRED, so the
 *  signed URL carries no x-amz-checksum-* params — which is what makes a
 *  browser PUT to R2 actually succeed (the default checksum params are signed
 *  over an empty body and never match the real upload). */
export async function getAmbientSoundUploadUrl(
  id: string,
  contentType: string,
): Promise<{ key: string; uploadUrl: string }> {
  const key = ambientSoundKey(id, contentType);
  const uploadUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 60 * 10 },
  );
  return { key, uploadUrl };
}

// A browser PUT to *.r2.cloudflarestorage.com is cross-origin, so R2 must
// return CORS headers allowing it or the browser blocks the upload. We set a
// permissive PUT/GET policy once per server instance (best-effort — cached so
// we don't re-send it on every upload). Non-credentialed presigned PUTs make
// AllowedOrigins "*" safe: possessing the short-lived signed URL is the only
// thing that authorizes the write.
let corsConfigured = false;
export async function ensureUploadCorsConfigured(): Promise<void> {
  if (corsConfigured) return;
  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["PUT", "GET"],
            AllowedOrigins: ["*"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  corsConfigured = true;
}

/** Signed playback URL for an ambient sound loop — same 4-hour window as
 *  story narration, plenty for one reading session. */
export async function getAmbientSoundUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 4 }
  );
}

/** Deletes an ambient sound's file from R2 — called when an admin removes it
 *  from the library entirely (not just deactivating it). */
export async function deleteAmbientSound(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
