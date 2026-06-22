import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Heading, Body } from "@/components/ui/typography";
import type { MockAuthor } from "@/content/mock/narriva-home";

export interface AuthorBioCardProps {
  author: MockAuthor;
  className?: string;
}

/** Compact author snippet used on the Book Detail page — distinct from the
 * full clickable AuthorCard used in listing grids. */
export function AuthorBioCard({ author, className }: AuthorBioCardProps) {
  return (
    <Card className={className}>
      <CardBody className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] font-semibold text-white"
          style={{ backgroundColor: author.avatarColor }}
        >
          {author.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="flex-1">
          <Heading as="h3" size="h4">
            {author.name}
          </Heading>
          <Body size="sm" className="mt-1 text-[var(--color-ink)]/70">
            {author.description}
          </Body>
          <Link
            href={`/authors/${author.slug}`}
            className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            View author profile
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
