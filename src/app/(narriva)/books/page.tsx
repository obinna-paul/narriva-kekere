import { NarrivaTheme } from "@/components/theme";
import { BookstoreContent } from "@/components/narriva/bookstore-content";
import { listBooks, getDistinctGenres } from "@/lib/data/books";
import { toBookCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const [{ books }, genres] = await Promise.all([
    listBooks({ pageSize: 100, sort: "newest" }),
    getDistinctGenres(),
  ]);

  return (
    <NarrivaTheme>
      <main>
        <BookstoreContent books={books.map(toBookCardData)} genres={genres} />
      </main>
    </NarrivaTheme>
  );
}
