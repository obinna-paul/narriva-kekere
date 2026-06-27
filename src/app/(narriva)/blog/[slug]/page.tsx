import Link from "next/link";
import { notFound } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import { getBlogPostBySlug, listBlogPosts } from "@/lib/data/blog";
import { toBlogCardData } from "@/lib/adapters/narriva";
import { renderSimpleMarkdown } from "@/lib/utils/markdown";

export const dynamic = "force-dynamic";

const WORDS_PER_MINUTE = 200;

function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const dbPost = await getBlogPostBySlug(params.slug);
  if (!dbPost) notFound();
  const post = toBlogCardData(dbPost);

  const { posts: categoryPosts } = await listBlogPosts({
    category: dbPost.category,
    pageSize: 4,
  });
  const related = categoryPosts.filter((p) => p.slug !== post.slug).slice(0, 3).map(toBlogCardData);

  return (
    <NarrivaTheme>
      <main>
        <article className="mx-auto max-w-[720px] px-8 pt-16">
          <div className="mb-6 flex items-center gap-3.5">
            <span className="rounded-full border border-[var(--color-primary)]/25 px-3 py-[5px] text-[11px] uppercase tracking-[0.06em] text-[var(--color-primary)]">
              {post.category}
            </span>
            <span className="text-sm text-[var(--color-muted-3)]">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-[44px] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--color-ink)]">
            {post.title}
          </h1>

          <div className="mt-[26px] flex items-center gap-3.5 border-b border-[var(--color-ink)]/10 pb-10">
            <div
              aria-hidden="true"
              className="h-[42px] w-[42px] shrink-0 rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #ECE7DD, #ECE7DD 9px, #E6E0D4 9px, #E6E0D4 18px)",
              }}
            />
            <div>
              <div className="text-sm font-semibold text-[var(--color-ink)]">{post.authorName}</div>
              <div className="text-[13px] text-[var(--color-muted-3)]">
                ~{estimateReadMinutes(dbPost.content)} min read
              </div>
            </div>
          </div>

          <PhotoPlaceholder
            label="featured photo · landscape"
            aspect="16/9"
            className="my-11 [box-shadow:0_18px_40px_-22px_rgba(22,22,22,0.28)]"
          />

          <div className="flex flex-col gap-[26px] text-lg leading-[1.75] text-[#2A2620] [&>blockquote]:my-2.5 [&>blockquote]:border-l-[3px] [&>blockquote]:border-[var(--color-accent)] [&>blockquote]:py-1.5 [&>blockquote]:pl-7 [&>blockquote]:font-[family-name:var(--font-display)] [&>blockquote]:text-[25px] [&>blockquote]:italic [&>blockquote]:leading-[1.4] [&>blockquote]:text-[var(--color-ink)]">
            {renderSimpleMarkdown(dbPost.content)}
          </div>

          <div className="mt-14 flex items-start gap-5 rounded-md border border-[var(--color-ink)]/[0.08] bg-[var(--color-bg-alt)] p-7">
            <div
              aria-hidden="true"
              className="h-[60px] w-[60px] shrink-0 rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #ECE7DD, #ECE7DD 9px, #E6E0D4 9px, #E6E0D4 18px)",
              }}
            />
            <div>
              <div className="font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)]">
                {post.authorName}
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
                Writes for the Narriva blog.
              </p>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-20 border-t border-[var(--color-ink)]/[0.07]">
            <div className="mx-auto max-w-[1140px] px-8 py-16">
              <h2 className="mb-9 font-[family-name:var(--font-display)] text-[26px] font-medium tracking-[-0.01em] text-[var(--color-ink)]">
                More from {post.category}
              </h2>
              <div className="grid grid-cols-1 gap-9 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="block transition-opacity hover:opacity-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <PhotoPlaceholder label="editorial photo" aspect="16/10" />
                    <div className="mt-4 text-[13px] text-[var(--color-muted-3)]">
                      {new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-medium leading-[1.2] text-[var(--color-ink)]">
                      {r.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </NarrivaTheme>
  );
}
