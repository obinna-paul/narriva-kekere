import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { MockBook } from "@/content/mock/narriva-home";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export interface BookCardProps {
  book: MockBook;
  className?: string;
}

export function BookCard({ book, className }: BookCardProps) {
  return (
    <Card className={className}>
      <div
        className="flex h-64 items-center justify-center p-6 text-center"
        style={{ backgroundColor: book.coverColor }}
        aria-hidden="true"
      >
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
          {book.title}
        </span>
      </div>
      <CardBody className="flex flex-col gap-3">
        <div>
          <Heading as="h3" size="h4" className="leading-snug">
            <Link href={`/books/${book.slug}`} className="hover:underline">
              {book.title}
            </Link>
          </Heading>
          <Body size="sm" className="text-[var(--color-ink)]/70">
            {book.author}
          </Body>
        </div>
        <Body size="sm">{book.hookLine}</Body>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-body)] font-semibold">
            {priceFormatter.format(book.priceNgn)}
          </span>
          <Link
            href={`/books/${book.slug}#excerpt`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Read the first chapter
          </Link>
        </div>
        <Link
          href={`/books/${book.slug}`}
          className={cn(buttonVariants({ size: "sm" }), "mt-1 w-full")}
        >
          Buy
        </Link>
      </CardBody>
    </Card>
  );
}
