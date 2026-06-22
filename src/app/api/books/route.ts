import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createBook, listBooks } from "@/lib/data/books";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const genre = url.searchParams.get("genre") ?? undefined;
  const authorSlug = url.searchParams.get("author") ?? undefined;
  const newOnly = url.searchParams.get("new") === "true";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");

  const result = await listBooks({ genre, authorSlug, newOnly, page, pageSize });
  return NextResponse.json(result);
}

const bookSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  authorId: z.string().min(1),
  genre: z.string().min(1),
  hookLine: z.string().min(1),
  synopsis: z.string().min(1),
  excerpt: z.array(z.string()).default([]),
  coverImageRef: z.string().min(1),
  ebookRef: z.string().min(1),
  chapterCount: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
  estimatedReadTime: z.number().int().nonnegative(),
  price: z.number().positive(),
  editorNote: z.string().optional(),
  editorNoteAttribution: z.string().optional(),
  featured: z.boolean().optional(),
  isNewRelease: z.boolean().optional(),
  publishedAt: z.coerce.date(),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const book = await createBook(parsed.data);
    return NextResponse.json({ book }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
