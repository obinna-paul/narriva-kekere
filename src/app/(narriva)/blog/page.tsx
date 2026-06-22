import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { BlogListing } from "@/components/narriva/blog-listing";
import { listBlogPosts } from "@/lib/data/blog";
import { toBlogCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { posts } = await listBlogPosts({ pageSize: 100 });

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container>
            <Heading as="h1" size="h1">
              From the desk
            </Heading>
            <Body size="lg" className="mt-4 max-w-2xl text-[var(--color-ink)]/80">
              Notes on craft, the editorial process, and what it actually takes to get a
              book from a draft to a shelf.
            </Body>
            <div className="mt-10">
              <BlogListing posts={posts.map(toBlogCardData)} />
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
