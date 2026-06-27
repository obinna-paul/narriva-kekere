import Link from "next/link";
import type { MockAuthor } from "@/content/mock/narriva-home";

export interface AuthorBioCardProps {
  author: MockAuthor;
  className?: string;
}

/** Author bio block on the Book Detail page — striped photo placeholder,
 * matching the treatment used everywhere else photography hasn't been shot
 * yet (see PhotoPlaceholder). Circular here rather than rectangular, so it's
 * kept inline rather than extending that component's aspect-ratio union. */
export function AuthorBioCard({ author, className }: AuthorBioCardProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-7">
        <div
          aria-hidden="true"
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ECE7DD, #ECE7DD 8px, #E6E0D4 8px, #E6E0D4 16px)",
          }}
        >
          <span className="absolute inset-x-0 bottom-2 text-center font-mono text-[8px] text-[#A99F8E]">
            photo
          </span>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-accent-text)]">
            About the author
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
            {author.name}
          </h3>
          <p className="mt-3 text-[15px] leading-[1.65] text-[var(--color-muted)]">{author.description}</p>
          <Link
            href={`/authors/${author.slug}`}
            className="mt-3.5 inline-block border-b border-[var(--color-primary)]/30 text-sm text-[var(--color-primary)]"
          >
            View author page →
          </Link>
        </div>
      </div>
    </div>
  );
}
