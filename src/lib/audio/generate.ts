import { prisma } from "@/lib/db/prisma";
import { uploadStoryAudio } from "@/lib/storage/r2";
import { docToPlainText, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const MAX_CHARS_PER_REQUEST = 4096;
const WORDS_PER_MINUTE = 130; // Nova's natural speaking pace, for the duration estimate
const GENERATABLE_STATUSES = ["NOT_GENERATED", "FAILED"] as const;

/** Splits text into <=maxChars chunks, only ever cutting at a paragraph
 * boundary ("\n\n") — never mid-sentence, since that would produce an
 * audible mid-paragraph silence at the chunk boundary either way, but at
 * least this keeps it natural-sounding. */
function chunkByParagraph(text: string, maxChars = MAX_CHARS_PER_REQUEST): string[] {
  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function synthesizeChunk(text: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: "nova",
      input: text,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS request failed (${res.status}): ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generates and stores narration audio for a published story. Never
 * throws — every failure path updates audioGenerationStatus = FAILED and
 * logs, since this runs fire-and-forget after publish (see the publish
 * route) and a thrown error here must not surface to that caller.
 */
export async function generateStoryAudio(storyId: string): Promise<void> {
  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { author: { select: { name: true } } },
    });
    if (!story) return;
    if (story.status !== "PUBLISHED") return;
    if (!GENERATABLE_STATUSES.includes(story.audioGenerationStatus as typeof GENERATABLE_STATUSES[number])) {
      return; // already GENERATING or GENERATED — don't double-generate
    }

    await prisma.story.update({
      where: { id: storyId },
      data: { audioGenerationStatus: "GENERATING" },
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const plainText = docToPlainText(story.body as unknown as TiptapDoc);
    const fullText = `[${story.title} by ${story.author.name}]. ${plainText}`;
    const chunks = chunkByParagraph(fullText);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      buffers.push(await synthesizeChunk(chunk, apiKey));
    }
    const audioBuffer = Buffer.concat(buffers);

    const audioRef = await uploadStoryAudio(storyId, audioBuffer);
    const audioDurationSecs = Math.round((story.wordCount / WORDS_PER_MINUTE) * 60);

    await prisma.story.update({
      where: { id: storyId },
      data: {
        audioRef,
        audioGeneratedAt: new Date(),
        audioDurationSecs,
        audioGenerationStatus: "GENERATED",
      },
    });
  } catch (error) {
    console.error(`[audio] generation failed for story ${storyId}:`, error);
    await prisma.story
      .update({ where: { id: storyId }, data: { audioGenerationStatus: "FAILED" } })
      .catch(() => {});
  }
}
