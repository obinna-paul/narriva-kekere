import Link from "next/link";
import { Heading, Body } from "@/components/ui/typography";
import { CategoryPill } from "@/components/narriva/category-pill";
import type { MockBlogPost } from "@/content/mock/narriva-blog";

export interface BlogCardProps {
  post: MockBlogPost;
  className?: string;
}

export function BlogCard({ post, className }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`flex flex-col gap-3 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className ?? ""}`}
    >
      <div
        aria-hidden="true"
        className="flex h-40 items-center justify-center rounded-md p-4 text-center"
        style={{ backgroundColor: post.coverColor }}
      >
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          {post.title}
        </span>
      </div>
      <div>
        <CategoryPill>{post.category}</CategoryPill>
      </div>
      <time dateTime={post.date} className="text-sm text-[var(--color-ink)]/60">
        {new Date(post.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
      <Heading as="h3" size="h4" className="hover:underline">
        {post.title}
      </Heading>
      <Body size="sm" className="text-[var(--color-ink)]/70">
        {post.excerpt}
      </Body>
    </Link>
  );
}
