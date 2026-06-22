import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/typography";
import { BookForm } from "@/components/admin/book-form";
import { getBookById } from "@/lib/data/books";
import { listAuthors } from "@/lib/data/authors";

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: { params: { id: string } }) {
  const [book, authors] = await Promise.all([getBookById(params.id), listAuthors()]);
  if (!book) notFound();

  return (
    <div>
      <Heading as="h1" size="h2">
        Edit book
      </Heading>
      <div className="mt-6">
        <BookForm
          mode="edit"
          bookId={book.id}
          authors={authors.map((a) => ({ id: a.id, name: a.name }))}
          initial={{
            slug: book.slug,
            title: book.title,
            authorId: book.authorId,
            genre: book.genre,
            hookLine: book.hookLine,
            synopsis: book.synopsis,
            excerpt: book.excerpt.join("\n\n"),
            coverColor: book.coverImageRef,
            ebookRef: book.ebookRef,
            chapterCount: String(book.chapterCount),
            wordCount: String(book.wordCount),
            estimatedReadTime: String(book.estimatedReadTime),
            price: String(book.price),
            editorNote: book.editorNote ?? "",
            editorNoteAttribution: book.editorNoteAttribution ?? "",
            featured: book.featured,
            isNewRelease: book.isNewRelease,
            publishedAt: book.publishedAt.toISOString().slice(0, 10),
          }}
        />
      </div>
    </div>
  );
}
