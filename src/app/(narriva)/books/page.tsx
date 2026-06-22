import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { BookCatalog } from "@/components/narriva/book-catalog";
import { listBooks } from "@/lib/data/books";
import { listAuthors } from "@/lib/data/authors";
import { toAuthorCardData, toBookCardData } from "@/lib/adapters/narriva";

// Real data from Phase 7 onward — no live DB connection in this sandbox
// means this can't be statically prerendered, so it's rendered per request.
export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const [{ books }, authors] = await Promise.all([
    listBooks({ pageSize: 100 }),
    listAuthors(),
  ]);

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Heading as="h1" size="h1">
              Bookstore
            </Heading>
            <Body size="lg" className="mt-4 max-w-2xl text-[var(--color-ink)]/80">
              Every book here went through a publisher willing to say no. Browse by
              genre, format, or author.
            </Body>
            <div className="mt-10">
              <BookCatalog
                books={books.map(toBookCardData)}
                authors={authors.map(toAuthorCardData)}
              />
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
