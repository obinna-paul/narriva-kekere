import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default function NarrivaNotFound() {
  return (
    <NarrivaTheme>
      <main>
        <Section spacing="lg" className="text-center">
          <Container size="sm">
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-accent)]">
              404
            </p>
            <Heading as="h1" size="h2" className="mt-2">
              We couldn&apos;t find that page
            </Heading>
            <Body size="base" className="mx-auto mt-3 max-w-md text-[var(--color-ink)]/70">
              The book, author, or post you&apos;re looking for may have been moved or
              doesn&apos;t exist.
            </Body>
            <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
              Back to the homepage
            </Link>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
