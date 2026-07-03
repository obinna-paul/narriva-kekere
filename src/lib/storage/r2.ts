import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
