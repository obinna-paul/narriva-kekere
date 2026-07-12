import { NarrivaTheme } from "@/components/theme";
import { ContactForm } from "@/components/narriva/contact-form";
import { CalendlyWidget } from "@/components/narriva/calendly-widget";

export const metadata = {
  title: "Contact",
  description:
    "Whether you're ready to submit your manuscript or just want to ask a question first, we'd love to hear from you.",
  alternates: { canonical: "/contact" },
};

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

export default function ContactPage() {
  return (
    <NarrivaTheme>
      <main className="mx-auto max-w-[960px] px-6 py-16">
        <header className="mb-14 text-center">
          <div className="mx-auto mb-[24px] h-px w-9 bg-[var(--color-accent)]" />
          <h1 className="font-[family-name:var(--font-display)] text-[38px] font-medium leading-[1.08] tracking-[-0.02em] text-[var(--color-ink)]">
            Let&apos;s talk about your book
          </h1>
          <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-[1.65] text-[var(--color-muted)]">
            Whether you&apos;re ready to submit or just want to ask a question first,
            we&apos;d love to hear from you.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-2">
          <section>
            <div className="mb-[10px] text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-accent-text)]">
              Book a call
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
              Schedule a discovery call
            </h2>
            <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
              Pick a time that works for you. It&apos;s a thirty-minute video call — zero
              commitment, just a conversation about your book and where it could go.
            </p>

            {calendlyUrl ? (
              <CalendlyWidget url={calendlyUrl} />
            ) : (
              <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-6">
                <p className="text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
                  Booking is being set up — email us at{" "}
                  <a href="mailto:hello@narriva.pro" className="text-[var(--color-primary)] underline">
                    hello@narriva.pro
                  </a>{" "}
                  and we&apos;ll schedule manually.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-[10px] text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-accent-text)]">
              Send a message
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[var(--color-ink)]">
              Drop us a note
            </h2>
            <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
              Prefer to write? Fill out the form and we&apos;ll get back to you within
              two business days.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>
        </div>

        <div className="mt-16 border-t border-[var(--color-border)] pt-10 text-center">
          <p className="text-[14px] text-[var(--color-muted)]">
            Or email us directly at{" "}
            <a href="mailto:hello@narriva.pro" className="font-medium text-[var(--color-primary)] underline">
              hello@narriva.pro
            </a>
          </p>
        </div>
      </main>
    </NarrivaTheme>
  );
}
