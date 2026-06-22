import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { deleteBook, getBookById, updateBook } from "@/lib/data/books";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const book = await getBookById(params.id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ book });
}

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  authorId: z.string().min(1).optional(),
  genre: z.string().min(1).optional(),
  hookLine: z.string().min(1).optional(),
  synopsis: z.string().min(1).optional(),
  excerpt: z.array(z.string()).optional(),
  coverImageRef: z.string().min(1).optional(),
  ebookRef: z.string().min(1).optional(),
  chapterCount: z.number().int().nonnegative().optional(),
  wordCount: z.number().int().nonnegative().optional(),
  estimatedReadTime: z.number().int().nonnegative().optional(),
  price: z.number().positive().optional(),
  editorNote: z.string().optional(),
  editorNoteAttribution: z.string().optional(),
  featured: z.boolean().optional(),
  isNewRelease: z.boolean().optional(),
  publishedAt: z.coerce.date().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const book = await updateBook(params.id, parsed.data);
    return NextResponse.json({ book });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    await deleteBook(params.id);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
