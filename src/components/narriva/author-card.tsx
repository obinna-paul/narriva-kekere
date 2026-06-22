import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Heading, Body } from "@/components/ui/typography";
import type { MockAuthor } from "@/content/mock/narriva-home";

export interface AuthorCardProps {
  author: MockAuthor;
  className?: string;
}

export function AuthorCard({ author, className }: AuthorCardProps) {
  return (
    <Link href={`/authors/${author.slug}`} className="block focus:outline-none">
      <Card
        className={`h-full transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className ?? ""}`}
      >
        <CardBody className="flex flex-col items-center gap-4 text-center">
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-xl font-semibold text-white"
            style={{ backgroundColor: author.avatarColor }}
          >
            {author.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>
          <div>
            <Heading as="h3" size="h4">
              {author.name}
            </Heading>
            <Body size="sm" className="mt-1 text-[var(--color-ink)]/70">
              {author.description}
            </Body>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
