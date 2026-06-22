import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { AuthorCard } from "@/components/narriva/author-card";
import { listAuthors } from "@/lib/data/authors";
import { toAuthorCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  const authors = await listAuthors();

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Heading as="h1" size="h1">
              Authors
            </Heading>
            <Body size="lg" className="mt-4 max-w-2xl text-[var(--color-ink)]/80">
              Every author on this list went through the same editorial process —
              including the ones who heard no first.
            </Body>
            <Grid cols={4} gap="md" className="mt-10">
              {authors.map((author) => (
                <AuthorCard key={author.id} author={toAuthorCardData(author)} />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
