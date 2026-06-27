import { Children, cloneElement, isValidElement } from "react";

export interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  /** Shown as a highlighted banner above the content — used for the
   * lawyer-review notice on Privacy/Terms and the "this is not the contract"
   * notice on the Publishing Agreement placeholder. Same visual treatment
   * either way; only the reason it appears differs per document. */
  notice?: string;
  children: React.ReactNode;
}

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sticky left TOC + right content article, per the design handoff's generic
 * Legal template. The TOC is derived directly from the `LegalSection`
 * children's `heading` prop — each child gets an id cloned onto it
 * (`#slugified-heading`) and the same slug backs its TOC anchor — so none of
 * the five documents that use this layout need to declare section ids by hand.
 */
export function LegalLayout({ title, lastUpdated, notice, children }: LegalLayoutProps) {
  const sections = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const heading = (child.props as { heading?: string }).heading ?? "";
      return { id: slugify(heading), heading, child };
    });

  return (
    <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-14 px-8 pb-[110px] pt-[72px] md:grid-cols-[240px_1fr]">
      <aside className="hidden md:sticky md:top-[104px] md:block md:self-start">
        <div className="mb-[18px] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-text)]">
          On this page
        </div>
        <nav className="flex flex-col gap-[11px]">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm leading-snug text-[var(--color-muted)] hover:text-[var(--color-primary)]"
            >
              {s.heading}
            </a>
          ))}
        </nav>
      </aside>

      <article>
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
          Legal
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[42px] font-medium tracking-[-0.02em] text-[var(--color-ink)]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-muted-3)]">Last updated {lastUpdated}</p>

        {notice && (
          <div className="mt-[30px] rounded-md border border-[#E8D9A0] bg-[#FBF3D9] px-[26px] py-[22px]">
            <p className="text-[15px] leading-[1.6] text-[#5A4A1E]">{notice}</p>
          </div>
        )}

        <div className="mt-9">
          {sections.map((s) =>
            cloneElement(s.child as React.ReactElement<{ id?: string }>, { id: s.id })
          )}
        </div>
      </article>
    </div>
  );
}

export interface LegalSectionProps {
  heading: string;
  id?: string;
  children: React.ReactNode;
}

export function LegalSection({ heading, id, children }: LegalSectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-[100px] pt-[18px]">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
        {heading}
      </h2>
      <div className="flex flex-col gap-4 text-base leading-[1.75] text-[#3A352E]">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
