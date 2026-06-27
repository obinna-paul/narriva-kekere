"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BlogCard } from "@/components/narriva/blog-card";
import { cn } from "@/lib/utils/cn";
import { BLOG_CATEGORIES, type BlogCategory, type MockBlogPost } from "@/content/mock/narriva-blog";

const ALL = "All";

export interface BlogListingProps {
  posts: readonly MockBlogPost[];
}

/** Search and category filtering run entirely client-side against the
 * already-fetched posts — real pagination is a later phase. */
export function BlogListing({ posts }: BlogListingProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<BlogCategory | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((post) => {
        if (category !== ALL && post.category !== category) return false;
        if (!query) return true;
        return (
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query)
        );
      });
  }, [posts, search, category]);

  return (
    <>
      <header className="mx-auto max-w-[1140px] px-8 pb-11 pt-20">
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
          Reading &amp; writing
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[52px] font-medium leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
          From the desk
        </h1>
        <p className="mt-4 max-w-[520px] text-[17px] text-[var(--color-muted)]">
          Notes on craft, publishing, and the long work of making a book — from the people
          who do it.
        </p>
      </header>

      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-6 px-8 pb-11">
        <div className="flex flex-wrap gap-2.5">
          {([ALL, ...BLOG_CATEGORIES] as const).map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "border border-[var(--color-ink)]/[0.16] bg-transparent text-[var(--color-muted)]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-[15px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A8A296]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the blog"
            aria-label="Search blog posts"
            className="w-[220px] rounded-full border border-[var(--color-ink)]/[0.16] bg-white py-2.5 pl-10 pr-[18px] text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      <section className="mx-auto max-w-[1140px] px-8 pb-[110px]">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-9 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-[var(--color-muted)]">No posts match your search.</p>
        )}
      </section>
    </>
  );
}
