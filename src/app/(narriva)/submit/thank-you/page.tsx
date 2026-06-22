import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default function SubmitThankYouPage() {
  return (
    <NarrivaTheme>
      <main>
        <Section spacing="lg" className="text-center">
          <Container size="sm">
            <Heading as="h1" size="h2">
              We&apos;ve got it
            </Heading>
            <Body size="base" className="mx-auto mt-4 max-w-md text-[var(--color-ink)]/70">
              Your manuscript is in the queue. An editor reads every submission in
              full — we&apos;ll be in touch by email, and you can check on its status
              any time from your Author Portal.
            </Body>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/portal" className={cn(buttonVariants({ size: "lg" }))}>
                Go to your Author Portal
              </Link>
              <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
                Back to the homepage
              </Link>
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
