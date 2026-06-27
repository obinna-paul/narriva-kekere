import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { FAQAccordion } from "@/components/narriva/faq-accordion";
import { PhotoPlaceholder } from "@/components/narriva/photo-placeholder";
import type { ServiceContent } from "@/content/mock/narriva-services";

export interface ServicePageTemplateProps {
  service: ServiceContent;
}

export function ServicePageTemplate({ service }: ServicePageTemplateProps) {
  return (
    <main>
      {/* Header with accent photo */}
      <header className="mx-auto max-w-[1240px] px-8 pt-14">
        <div className="mb-[30px] text-[13px] text-[var(--color-muted-3)]">
          <Link href="/services" className="hover:text-[var(--color-primary)]">
            Services
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-[var(--color-muted)]">{service.name}</span>
        </div>
        <div className="grid items-center gap-14 [grid-template-columns:1.05fr_0.95fr] lg:grid">
          <div>
            <div className="mb-[26px] h-px w-9 bg-[var(--color-accent)]" />
            <h1 className="font-[family-name:var(--font-display)] text-[42px] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[58px]">
              {service.name}
            </h1>
            <p className="mt-[22px] max-w-[440px] font-[family-name:var(--font-display)] text-lg italic leading-[1.55] text-[var(--color-primary)]">
              {service.tagline}
            </p>
          </div>
          <div className="hidden lg:block">
            <PhotoPlaceholder
              label="photo · editor marking up a manuscript"
              aspect="4/3"
              className="shadow-[0_18px_40px_-20px_rgba(22,22,22,0.3)]"
            />
          </div>
        </div>
      </header>

      {/* Opening */}
      <section className="mx-auto max-w-[720px] px-8 pt-[72px]">
        <p className="font-[family-name:var(--font-display)] text-xl leading-[1.65] text-[#2A2620]">
          {service.opening}
        </p>
      </section>

      {/* What's included */}
      <section className="mx-auto max-w-[720px] px-8 pt-14">
        <h2 className="mb-7 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
          What&apos;s included
        </h2>
        <div>
          {service.included.map((item) => (
            <div
              key={item.title}
              className="flex gap-[18px] border-b border-[var(--color-ink)]/[0.08] py-[18px] last:border-0"
            >
              <span className="mt-2 h-[7px] w-[7px] flex-none rounded-full bg-[var(--color-accent)]" />
              <div>
                <div className="text-base font-semibold text-[var(--color-ink)]">{item.title}</div>
                <div className="mt-1 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[15px] leading-[1.7] text-[var(--color-muted)]">{service.closing}</p>
      </section>

      {/* Cost */}
      <section className="mx-auto max-w-[720px] px-8 pt-16">
        <div className="rounded-md border border-[var(--color-ink)]/[0.08] bg-[var(--color-bg-alt)] px-11 py-11 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium tracking-[-0.01em] text-[var(--color-ink)]">
            Every book is different — let&apos;s talk about yours.
          </h2>
          <p className="mx-auto mt-3.5 max-w-[420px] text-[15.5px] leading-[1.6] text-[var(--color-muted)]">
            {service.costClarity}
          </p>
          <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "mt-6 px-7 py-[15px] text-[15px]")}>
            Talk to us about your book
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[720px] px-8 pb-[100px] pt-[72px]">
        <h2 className="mb-[30px] font-[family-name:var(--font-display)] text-[32px] font-medium tracking-[-0.01em] text-[var(--color-ink)]">
          Questions authors ask
        </h2>
        <FAQAccordion items={service.faqs} />
      </section>
    </main>
  );
}
