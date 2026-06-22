import { notFound } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading } from "@/components/ui/typography";
import { CategoryPill } from "@/components/narriva/category-pill";
import { getBlogPostBySlug } from "@/lib/data/blog";
import { toBlogCardData } from "@/lib/adapters/narriva";
import { renderSimpleMarkdown } from "@/lib/utils/markdown";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const dbPost = await getBlogPostBySlug(params.slug);
  if (!dbPost) notFound();
  const post = toBlogCardData(dbPost);

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <CategoryPill>{post.category}</CategoryPill>
            <Heading as="h1" size="h1" className="mt-4">
              {post.title}
            </Heading>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-ink)]/60">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span aria-hidden="true">·</span>
              <span>{post.authorName}</span>
            </div>
          </Container>
        </Section>

        <Section className="!pt-0">
          <Container size="md">
            <div
              aria-hidden="true"
              className="flex h-64 items-center justify-center rounded-lg p-8 text-center sm:h-80"
              style={{ backgroundColor: post.coverColor }}
            >
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                {post.title}
              </span>
            </div>

            <div className="mt-10 flex flex-col gap-5 text-lg leading-relaxed text-[var(--color-ink)]/80">
              {renderSimpleMarkdown(dbPost.content)}
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
