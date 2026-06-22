"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Grid } from "@/components/ui/layout";
import { Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { BlogCard } from "@/components/narriva/blog-card";
import { CategoryPill } from "@/components/narriva/category-pill";
import { BLOG_CATEGORIES, type BlogCategory, type MockBlogPost } from "@/content/mock/narriva-blog";

const ALL = "all";
const PAGE_SIZE = 6;

export interface BlogListingProps {
  posts: readonly MockBlogPost[];
}

/** Search and category filtering run entirely client-side against the
 * static mock array — real search/pagination against the database is a
 * later phase. */
export function BlogListing({ posts }: BlogListingProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<BlogCategory | typeof ALL>(ALL);
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePosts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectCategory(next: BlogCategory | typeof ALL) {
    setCategory(next);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div>
      <Input
        type="search"
        value={search}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder="Search posts"
        aria-label="Search blog posts"
        className="max-w-sm"
      />

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <CategoryPill as="button" active={category === ALL} onClick={() => selectCategory(ALL)}>
          All
        </CategoryPill>
        {BLOG_CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            as="button"
            active={category === cat}
            onClick={() => selectCategory(cat)}
          >
            {cat}
          </CategoryPill>
        ))}
      </div>

      <Body size="sm" className="mt-6 text-[var(--color-ink)]/60">
        Showing {pagePosts.length} of {filtered.length} posts
      </Body>

      {pagePosts.length > 0 ? (
        <Grid cols={3} gap="lg" className="mt-6">
          {pagePosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </Grid>
      ) : (
        <p className="mt-12 text-center text-[var(--color-ink)]/60">
          No posts match your search.
        </p>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--color-ink)]/60">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
