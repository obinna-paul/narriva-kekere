import { notFound } from "next/navigation";
import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { BookDetailGallery } from "@/components/narriva/book-detail-gallery";
import { AuthorBioCard } from "@/components/narriva/author-bio-card";
import { ExcerptReader } from "@/components/narriva/excerpt-reader";
import { EditorNote } from "@/components/narriva/editor-note";
import { getBookBySlug } from "@/lib/data/books";
import { toAuthorCardData, toBookCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default async function BookDetailPage({ params }: { params: { slug: string } }) {
  const dbBook = await getBookBySlug(params.slug);
  if (!dbBook) notFound();

  const book = toBookCardData(dbBook);
  const author = toAuthorCardData(dbBook.author);

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr]">
              <BookDetailGallery title={book.title} coverColor={book.coverColor} />

              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-accent)]">
                    {book.genre}
                  </p>
                  <Heading as="h1" size="h1" className="mt-2">
                    {book.title}
                  </Heading>
                </div>

                <p className="font-[family-name:var(--font-display)] text-xl italic leading-relaxed text-[var(--color-primary)]">
                  {book.hookLine}
                </p>

                <AuthorBioCard author={author} className="max-w-md" />

                <div className="flex flex-wrap items-center gap-4 border-t border-[var(--color-ink)]/10 pt-6">
                  <span className="text-2xl font-semibold">
                    {priceFormatter.format(book.priceNgn)}
                  </span>
                  <span className="text-sm text-[var(--color-ink)]/60">
                    {book.chapterCount} chapters · {book.wordCount.toLocaleString()} words · ~{book.estimatedReadTime} min
                  </span>
                </div>

                <Link
                  href={`/checkout/${book.slug}`}
                  className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
                >
                  Buy
                </Link>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container size="md">
            <Heading as="h2" size="h3">
              Synopsis
            </Heading>
            <Body size="lg" className="mt-4 text-[var(--color-ink)]/80">
              {book.synopsis}
            </Body>
          </Container>
        </Section>

        <Section id="excerpt">
          <Container size="md">
            <Heading as="h2" size="h3" className="mb-6">
              Read an excerpt
            </Heading>
            <ExcerptReader paragraphs={book.excerpt} />
          </Container>
        </Section>

        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container size="md">
            <EditorNote text={book.editorNote.text} editor={book.editorNote.editor} />
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
