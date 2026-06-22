import { notFound } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { BookCard } from "@/components/narriva/book-card";
import { getAuthorBySlug } from "@/lib/data/authors";
import { toAuthorDetailData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function AuthorDetailPage({ params }: { params: { slug: string } }) {
  const dbAuthor = await getAuthorBySlug(params.slug);
  if (!dbAuthor) notFound();

  const author = toAuthorDetailData(dbAuthor);

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <span
                aria-hidden="true"
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-3xl font-semibold text-white"
                style={{ backgroundColor: author.avatarColor }}
              >
                {author.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <Heading as="h1" size="h1">
                  {author.name}
                </Heading>
                <Body size="lg" className="mt-2 text-[var(--color-ink)]/70">
                  {author.description}
                </Body>
              </div>
            </div>

            <div className="mt-10 flex max-w-2xl flex-col gap-4">
              {author.bio.map((paragraph, i) => (
                <Body key={i} size="base" className="text-[var(--color-ink)]/80">
                  {paragraph}
                </Body>
              ))}
            </div>

            {author.socialLinks && author.socialLinks.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-4">
                {author.socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Section>

        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container>
            <Heading as="h2" size="h2">
              Books by {author.name}
            </Heading>
            {author.books.length > 0 ? (
              <Grid cols={3} gap="lg" className="mt-10">
                {author.books.map((book) => (
                  <BookCard key={book.slug} book={book} />
                ))}
              </Grid>
            ) : (
              <Body size="base" className="mt-6 text-[var(--color-ink)]/60">
                No published books yet.
              </Body>
            )}
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
