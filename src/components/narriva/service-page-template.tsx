import Link from "next/link";
import { Check } from "lucide-react";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { FAQAccordion } from "@/components/narriva/faq-accordion";
import type { ServiceContent } from "@/content/mock/narriva-services";

export interface ServicePageTemplateProps {
  service: ServiceContent;
}

export function ServicePageTemplate({ service }: ServicePageTemplateProps) {
  return (
    <main>
      <Section>
        <Container size="md">
          <Heading as="h1" size="h1">
            {service.name}
          </Heading>
          <Body size="lg" className="mt-6 text-[var(--color-ink)]/80">
            {service.opening}
          </Body>
        </Container>
      </Section>

      <Section className="bg-[var(--color-ink)]/[0.03]">
        <Container size="md">
          <Heading as="h2" size="h3">
            What&apos;s included
          </Heading>
          <ul className="mt-8 flex flex-col gap-6">
            {service.included.map((item) => (
              <li key={item.title} className="flex gap-3">
                <Check
                  className="mt-1 h-5 w-5 shrink-0 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <Body size="base" className="mt-1 text-[var(--color-ink)]/70">
                    {item.description}
                  </Body>
                </div>
              </li>
            ))}
          </ul>
          <Body size="base" className="mt-8 text-[var(--color-ink)]/80">
            {service.closing}
          </Body>
        </Container>
      </Section>

      <Section>
        <Container size="md" className="text-center">
          <Body size="base" className="text-[var(--color-ink)]/70">
            {service.costClarity}
          </Body>
          <Heading as="h2" size="h3" className="mx-auto mt-4 max-w-xl text-balance">
            Every book is different — book a discovery call and we&apos;ll scope yours.
          </Heading>
          <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
            Book a discovery call
          </Link>
        </Container>
      </Section>

      <Section className="bg-[var(--color-ink)]/[0.03]">
        <Container size="md">
          <Heading as="h2" size="h3" className="mb-2">
            Frequently asked questions
          </Heading>
          <div className="mt-6">
            <FAQAccordion items={service.faqs} />
          </div>
        </Container>
      </Section>
    </main>
  );
}
