import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { LibraryBookCard } from "@/components/narriva/library-book-card";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getPurchasedBooksWithProgress } from "@/lib/data/books";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login); this still reads the session to know whose library to fetch.
export default async function AccountLibraryPage() {
  const session = await getCurrentSession();
  const library = session?.user?.id ? await getPurchasedBooksWithProgress(session.user.id) : [];

  return (
    <NarrivaTheme>
      <main>
        <header className="mx-auto max-w-[1140px] px-8 pb-11 pt-16">
          <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
            Your library
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[42px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
            Everything you&apos;ve bought
          </h1>
        </header>

        <section className="mx-auto max-w-[1140px] px-8 pb-[110px]">
          {library.length === 0 ? (
            <p className="py-12 text-center text-[var(--color-muted)]">
              You haven&apos;t bought any books yet.{" "}
              <Link href="/books" className="text-[var(--color-primary)] underline">
                Browse the bookstore
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {library.map((item) => {
                const finished = !!item.progress && item.progress.currentChapter >= item.chapterCount;
                const status = !item.progress
                  ? "Not started"
                  : finished
                    ? "Finished"
                    : `In progress · Chapter ${item.progress.currentChapter} of ${item.chapterCount}`;
                const progressPct = item.progress
                  ? Math.min(100, Math.round((item.progress.currentChapter / Math.max(1, item.chapterCount)) * 100))
                  : 0;
                const cta = !item.progress ? "Start reading" : finished ? "Read again" : "Continue reading";

                return (
                  <LibraryBookCard
                    key={item.id}
                    bookId={item.id}
                    title={item.title}
                    author={item.authorName}
                    coverColor={item.coverImageRef}
                    progressPct={progressPct}
                    status={status}
                    statusColor={!item.progress ? "muted" : finished ? "success" : "primary"}
                    cta={cta}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </NarrivaTheme>
  );
}
