import Link from "next/link";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import type { MockBlogPost } from "@/content/mock/narriva-blog";

export interface BlogCardProps {
  post: MockBlogPost;
  className?: string;
}

export function BlogCard({ post, className }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`block opacity-100 transition-opacity hover:opacity-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className ?? ""}`}
    >
      <PhotoPlaceholder label="editorial photo" aspect="16/10" />
      <div className="mt-[18px] flex items-center gap-3">
        <span className="rounded-full border border-[var(--color-primary)]/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--color-primary)]">
          {post.category}
        </span>
        <span className="text-[13px] text-[var(--color-muted-3)]">
          {new Date(post.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>
      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-[23px] font-medium leading-[1.2] text-[var(--color-ink)]">
        {post.title}
      </h3>
      <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">{post.excerpt}</p>
      <span className="mt-3 inline-block border-b border-[var(--color-primary)]/25 text-[13px] text-[var(--color-primary)]">
        Read more →
      </span>
    </Link>
  );
}
