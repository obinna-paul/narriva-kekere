import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getBookById, getBookPurchase, getReadingProgress } from "@/lib/data/books";
import { getEbookChapter } from "@/lib/storage/r2";
import { EbookReader } from "@/components/narriva/ebook-reader";

export const dynamic = "force-dynamic";

export default async function ReadBookPage({ params }: { params: { bookId: string } }) {
  const session = await getCurrentSession();
  if (!session?.user) redirect(`/login?callbackUrl=/read/${params.bookId}`);

  const book = await getBookById(params.bookId);
  if (!book) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const purchase = isAdmin ? null : await getBookPurchase(session.user.id, book.id);
  if (!isAdmin && !purchase) redirect(`/books/${book.slug}`);

  const progress = await getReadingProgress(session.user.id, book.id);
  const initialChapter = progress?.currentChapter ?? 1;

  // R2 may not be configured in every environment (no ebook content
  // uploaded yet) — fail soft into the reader's own "content unavailable"
  // state rather than 500ing the whole page.
  let chapter: { index: number; title: string; body: string } | null = null;
  try {
    chapter = await getEbookChapter(book.ebookRef, initialChapter);
  } catch {
    chapter = null;
  }

  return (
    <EbookReader
      bookId={book.id}
      bookTitle={book.title}
      bookSlug={book.slug}
      chapterCount={book.chapterCount}
      wordCount={book.wordCount}
      userEmail={session.user.email ?? ""}
      initialChapter={chapter}
      initialChapterIndex={initialChapter}
      initialScrollPosition={progress?.currentScrollPosition ?? 0}
      initialCompletedChapterIds={progress?.completedChapterIds ?? []}
      hadExistingProgress={!!progress}
    />
  );
}
