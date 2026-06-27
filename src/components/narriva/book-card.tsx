import Link from "next/link";
import { coverTextColors } from "@/lib/utils/cover-colors";
import type { MockBook } from "@/content/mock/narriva-home";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export interface BookCardProps {
  book: MockBook;
  className?: string;
  /** `store` shows a solid blue "Buy" button linking to the detail page;
   *  `author` (used on an author's own page) drops the now-redundant author
   *  byline and hook line, and shows a plain "View →" link instead of Buy;
   *  `default` shows inline "Read a chapter" / "Buy" text links. */
  variant?: "store" | "default" | "author";
}

export function BookCard({ book, className, variant = "default" }: BookCardProps) {
  const { ink, faint } = coverTextColors(book.coverColor);

  return (
    <div className={className}>
      <Link
        href={`/books/${book.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <div
          className="flex aspect-[3/4] flex-col justify-between border-l-4 border-black/[0.16] px-[26px] py-[30px] transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(.2,.7,.3,1)] hover:-translate-y-1.5"
          style={{
            backgroundColor: book.coverColor,
            borderRadius: "3px 5px 5px 3px",
            boxShadow: "0 14px 32px -16px rgba(22,22,22,0.34)",
          }}
        >
          <span className="font-[family-name:var(--font-display)] text-xs italic" style={{ color: faint }}>
            Narriva
          </span>
          <div>
            <div className="mb-[15px] h-px w-[26px] bg-[var(--color-accent)]" />
            <div
              className="font-[family-name:var(--font-display)] text-2xl font-medium leading-[1.13]"
              style={{ color: ink }}
            >
              {book.title}
            </div>
            {variant !== "author" && (
              <div className="mt-[13px] text-[10px] tracking-[0.06em]" style={{ color: faint }}>
                {book.author.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          <Link href={`/books/${book.slug}`} className="hover:underline">
            <div className="font-[family-name:var(--font-display)] text-xl font-medium leading-[1.18] text-[var(--color-ink)]">
              {book.title}
            </div>
          </Link>
          {variant !== "author" && (
            <>
              <div className="mt-[5px] text-[13.5px] text-[var(--color-muted-3)]">{book.author}</div>
              <div className="mt-2.5 text-[13.5px] italic leading-[1.45] text-[#4A463F]">
                &ldquo;{book.hookLine}&rdquo;
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-[var(--color-ink)]">
          {priceFormatter.format(book.priceNgn)}
        </span>
        {variant === "store" ? (
          <Link
            href={`/books/${book.slug}`}
            className="inline-flex items-center justify-center rounded-[2px] bg-[var(--color-primary)] px-5 py-[9px] text-[13px] font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-primary-light)]"
          >
            Buy
          </Link>
        ) : variant === "author" ? (
          <Link
            href={`/books/${book.slug}`}
            className="border-b border-[var(--color-primary)]/25 text-[13px] text-[var(--color-primary)]"
          >
            View →
          </Link>
        ) : (
          <div className="flex gap-4">
            <Link
              href={`/books/${book.slug}#excerpt`}
              className="text-[13px] text-[var(--color-primary)]"
            >
              Read a chapter
            </Link>
            <Link href={`/books/${book.slug}`} className="text-[13px] text-[var(--color-primary)]">
              Buy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
