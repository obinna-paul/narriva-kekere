import { NarrivaTheme } from "@/components/theme";
import { AuthorCard } from "@/components/narriva/author-card";
import { listAuthors } from "@/lib/data/authors";
import { toAuthorCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Authors",
  description: "Meet the authors published by Narriva.",
  alternates: { canonical: "/authors" },
};

export default async function AuthorsPage() {
  const authors = await listAuthors({ withBooksOnly: true });

  return (
    <NarrivaTheme>
      <main>
        <header className="mx-auto max-w-[1140px] px-8 pb-[50px] pt-20">
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
            Built here
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[52px] font-medium leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
            Authors
          </h1>
          <p className="mt-4 text-[17px] text-[var(--color-muted)]">
            The authors Narriva has worked with.
          </p>
        </header>

        <section className="mx-auto max-w-[1140px] px-8 pb-[110px]">
          <div className="grid grid-cols-1 gap-x-9 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.id} author={toAuthorCardData(author)} />
            ))}
          </div>
        </section>
      </main>
    </NarrivaTheme>
  );
}
