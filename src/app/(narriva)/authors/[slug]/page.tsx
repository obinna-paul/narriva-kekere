import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NarrivaTheme } from "@/components/theme";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import { BookCard } from "@/components/narriva/book-card";
import { getAuthorBySlug } from "@/lib/data/authors";
import { toAuthorDetailData } from "@/lib/adapters/narriva";
import { JsonLd } from "@/components/seo/json-ld";
import { personSchema, breadcrumbSchema } from "@/lib/seo/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author || author.books.length === 0) return {};

  const description = author.shortBio || author.bio || `Books by ${author.name} on Narriva.`;
  const ogImage = `/api/og?brand=narriva&title=${encodeURIComponent(author.name)}&subtitle=${encodeURIComponent(
    "Narriva author"
  )}`;

  return {
    title: author.name,
    description,
    alternates: { canonical: `/authors/${params.slug}` },
    openGraph: {
      title: author.name,
      description,
      url: `/authors/${params.slug}`,
      type: "profile",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: author.name,
      description,
    },
  };
}

export default async function AuthorDetailPage({ params }: { params: { slug: string } }) {
  const dbAuthor = await getAuthorBySlug(params.slug);
  // A WRITER with zero Narriva books is a Kekere-only author (same shared
  // auth, different brand) — not a real Narriva author page to show.
  if (!dbAuthor || dbAuthor.books.length === 0) notFound();

  const author = toAuthorDetailData(dbAuthor);

  return (
    <NarrivaTheme>
      <JsonLd
        data={personSchema({
          slug: params.slug,
          name: dbAuthor.name,
          bio: dbAuthor.bio,
          shortBio: dbAuthor.shortBio,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Authors", path: "/authors" },
          { name: author.name, path: `/authors/${params.slug}` },
        ])}
      />
      <main>
        <div className="mx-auto max-w-[1140px] px-8 pt-[34px]">
          <div className="text-[13px] text-[var(--color-muted-3)]">
            <Link href="/authors" className="text-[var(--color-muted-3)] hover:text-[var(--color-primary)]">
              Authors
            </Link>
            <span className="mx-2 opacity-50">/</span>
            <span className="text-[var(--color-muted)]">{author.name}</span>
          </div>
        </div>

        <header className="mx-auto grid max-w-[1140px] gap-14 px-8 py-10 pb-[72px] lg:grid-cols-[34%_1fr] lg:items-start">
          <PhotoPlaceholder
            label="author photo"
            aspect="4/5"
            className="rounded [box-shadow:0_18px_40px_-22px_rgba(22,22,22,0.3)]"
          />

          <div>
            <div className="mb-6 h-px w-9 bg-[var(--color-accent)]" />
            <h1 className="font-[family-name:var(--font-display)] text-[50px] font-medium leading-[1.04] tracking-[-0.02em] text-[var(--color-ink)]">
              {author.name}
            </h1>
            <p className="mt-4 font-[family-name:var(--font-display)] text-lg italic text-[var(--color-primary)]">
              {author.description}
            </p>

            <div className="mt-7 flex max-w-[520px] flex-col gap-[18px] text-base leading-[1.7] text-[#2A2620]">
              {author.bio.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {author.socialLinks && author.socialLinks.length > 0 && (
              <div className="mt-7 flex gap-[22px]">
                {author.socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="border-b border-[var(--color-primary)]/30 text-sm text-[var(--color-primary)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[1140px] px-8 py-16">
            <h2 className="mb-10 font-[family-name:var(--font-display)] text-[32px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
              Books by {author.name}
            </h2>
            <div className="grid grid-cols-1 gap-x-10 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
              {author.books.map((book) => (
                <BookCard key={book.slug} book={book} variant="author" />
              ))}
            </div>
          </div>
        </section>
      </main>
    </NarrivaTheme>
  );
}
