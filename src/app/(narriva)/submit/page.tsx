import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { SubmissionForm } from "@/components/narriva/submission-form";

export default function SubmitPage() {
  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <Heading as="h1" size="h1">
              Submit your manuscript
            </Heading>
            <Body size="lg" className="mt-4 text-[var(--color-ink)]/80">
              An editor reads the whole thing — not a synopsis, the whole thing — and
              tells you yes, no, or &quot;yes, if.&quot; No form rejections.
            </Body>
            <div className="mt-10">
              <SubmissionForm />
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
