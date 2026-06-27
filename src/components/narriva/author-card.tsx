import Link from "next/link";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import type { MockAuthor } from "@/content/mock/narriva-home";

export interface AuthorCardProps {
  author: MockAuthor;
  className?: string;
}

export function AuthorCard({ author, className }: AuthorCardProps) {
  return (
    <Link
      href={`/authors/${author.slug}`}
      className={`block opacity-100 transition-opacity hover:opacity-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className ?? ""}`}
    >
      <PhotoPlaceholder label="author photo" aspect="4/5" />
      <h3 className="mt-[18px] font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
        {author.name}
      </h3>
      <p className="mt-1.5 text-[14.5px] italic leading-[1.45] text-[var(--color-muted-2)]">
        {author.description}
      </p>
      <span className="mt-3 inline-block border-b border-[var(--color-primary)]/25 text-[13px] text-[var(--color-primary)]">
        View author →
      </span>
    </Link>
  );
}
