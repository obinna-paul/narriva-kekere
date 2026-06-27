import Link from "next/link";
import { notFound } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { BookDetailCover } from "@/components/narriva/book-detail-cover";
import { AuthorBioCard } from "@/components/narriva/author-bio-card";
import { BookExcerptSection } from "@/components/narriva/book-excerpt-section";
import { EditorNote } from "@/components/narriva/editor-note";
import { BuyBookButton } from "@/components/narriva/buy-book-button";
import { getBookBySlug, getBookPurchase, getReadingProgress } from "@/lib/data/books";
import { toAuthorCardData, toBookCardData } from "@/lib/adapters/narriva";
import { getCurrentSession } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatReadTime(minutes: number): string {
  if (minutes < 60) return `~${minutes} min reading`;
  return `~${Math.round(minutes / 60)} hours reading`;
}

export default async function BookDetailPage({ params }: { params: { slug: string } }) {
  const dbBook = await getBookBySlug(params.slug);
  if (!dbBook) notFound();

  const book = toBookCardData(dbBook);
  const author = toAuthorCardData(dbBook.author);
  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  const purchase = userId ? await getBookPurchase(userId, book.id) : null;
  const progress = userId && purchase ? await getReadingProgress(userId, book.id) : null;

  const buyButtonProps = {
    bookId: book.id,
    bookSlug: book.slug,
    priceNgn: book.priceNgn,
    userId,
    userEmail: session?.user?.email ?? null,
    purchased: !!purchase,
    hasProgress: !!progress,
  };

  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto max-w-[1140px] px-8 pt-7">
          <div className="text-[13px] text-[var(--color-muted-3)]">
            <Link href="/books" className="text-[var(--color-muted-3)] hover:text-[var(--color-primary)]">
              Bookstore
            </Link>
            <span className="mx-2 opacity-50">/</span>
            {book.genre}
            <span className="mx-2 opacity-50">/</span>
            <span className="text-[var(--color-muted)]">{book.title}</span>
          </div>
        </div>

        <header className="mx-auto grid max-w-[1140px] gap-16 px-8 py-10 pb-16 lg:grid-cols-[40%_1fr] lg:items-start">
          <div className="lg:sticky lg:top-[104px]">
            <BookDetailCover title={book.title} author={book.author} coverColor={book.coverColor} />
          </div>

          <div>
            <p className="font-[family-name:var(--font-display)] text-[30px] italic leading-[1.28] tracking-[-0.01em] text-[var(--color-primary)]">
              &ldquo;{book.hookLine}&rdquo;
            </p>
            <h1 className="mt-[30px] font-[family-name:var(--font-display)] text-[38px] font-medium leading-[1.1] tracking-[-0.015em] text-[var(--color-ink)]">
              {book.title}
            </h1>
            <div className="mt-3 text-base text-[var(--color-muted)]">
              by{" "}
              <Link
                href={`/authors/${author.slug}`}
                className="border-b border-[var(--color-primary)]/30 text-[var(--color-primary)]"
              >
                {book.author}
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-5 text-sm text-[var(--color-muted-3)]">
              <span>{book.genre}</span>
              <span className="opacity-40">·</span>
              <span>{formatReadTime(book.estimatedReadTime)}</span>
              <span className="opacity-40">·</span>
              <span>{book.chapterCount} chapters</span>
            </div>

            <div className="mt-8 rounded border border-[var(--color-border)] bg-white p-7">
              <div className="mb-[18px] flex items-baseline justify-between">
                <span className="font-[family-name:var(--font-display)] text-[32px] font-medium text-[var(--color-ink)]">
                  {priceFormatter.format(book.priceNgn)}
                </span>
                <span className="text-[13px] text-[var(--color-muted-3)]">One-time · yours to keep</span>
              </div>
              <BuyBookButton {...buyButtonProps} className="w-full" />
              <p className="mt-3.5 text-center text-[13px] text-[var(--color-muted-3)]">
                Instant access. Read in your browser, no download required.
              </p>
            </div>

            <a
              href="#chapter"
              className="mt-[22px] inline-block border-b border-[var(--color-primary)]/30 text-[15px] text-[var(--color-primary)]"
            >
              Read the first chapter ↓
            </a>
          </div>
        </header>

        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[740px] px-8 py-[72px]">
            <h2 className="mb-7 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
              About the book
            </h2>
            <p className="font-[family-name:var(--font-display)] text-[19px] leading-[1.7] text-[#2A2620]">
              {book.synopsis}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[740px] px-8 pb-2">
          <EditorNote text={book.editorNote.text} editor={book.editorNote.editor} />
        </section>

        <section className="mt-16 border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[740px] px-8 py-14">
            <AuthorBioCard author={author} />
          </div>
        </section>

        <BookExcerptSection
          paragraphs={book.excerpt}
          priceNgn={book.priceNgn}
          buyButtonProps={buyButtonProps}
        />
      </main>
    </NarrivaTheme>
  );
}
