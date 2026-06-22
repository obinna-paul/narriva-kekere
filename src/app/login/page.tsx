import { Suspense } from "react";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { LoginForm } from "@/components/narriva/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <NarrivaTheme>
      {/* This route sits outside the (narriva) group, so it doesn't inherit
          that layout's background/text colour class — set it here instead. */}
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <Section spacing="lg">
          <Container size="sm">
            <Heading as="h1" size="h2">
              Sign in
            </Heading>
            <Body size="base" className="mt-2 text-[var(--color-ink)]/70">
              Sign in to view your submissions and Author Portal.
            </Body>
            <div className="mt-8">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
