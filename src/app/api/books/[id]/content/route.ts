import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getBookById, getBookPurchase } from "@/lib/data/books";
import { getEbookChapter, getEbookContent } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const userId = session.user.id;
  const bookId = params.id;

  // Admins can preview unpurchased content (e.g. right after uploading it)
  // without needing a BookPurchase row of their own.
  if (session.user.role !== "ADMIN") {
    const purchase = await getBookPurchase(userId, bookId);
    if (!purchase) {
      return NextResponse.json({ error: "Not purchased" }, { status: 403 });
    }
  }

  const book = await getBookById(bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const chapterParam = url.searchParams.get("chapter");

  if (chapterParam !== null) {
    const chapterIndex = Number(chapterParam);
    if (isNaN(chapterIndex) || chapterIndex < 0) {
      return NextResponse.json(
        { error: "Invalid chapter index" },
        { status: 400 }
      );
    }

    const chapter = await getEbookChapter(book.ebookRef, chapterIndex);
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({
      chapterIndex: chapter.index,
      title: chapter.title,
      body: chapter.body,
      totalChapters: book.chapterCount,
    });
  }

  const content = await getEbookContent(book.ebookRef);
  return NextResponse.json({
    title: content.title,
    chapterCount: content.chapterCount,
    chapters: content.chapters.map((c) => ({
      index: c.index,
      title: c.title,
      body: c.body,
      wordCount: c.body.split(/\s+/).filter(Boolean).length,
    })),
  });
});
