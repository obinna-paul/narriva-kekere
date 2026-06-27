import Link from "next/link";

const SERVICES = [
  { label: "Publishing", href: "/services/publishing" },
  { label: "Editorial", href: "/services/editorial" },
  { label: "Design", href: "/services/design" },
  { label: "Author Growth", href: "/services/author-growth" },
  { label: "Ghostwriting", href: "/services/ghostwriting" },
] as const;

const BOOKSTORE = [
  { label: "All books", href: "/books" },
  { label: "By author", href: "/authors" },
  { label: "New this season", href: "/books" },
] as const;

const COMPANY = [
  { label: "About", href: "/about" },
  { label: "How We Work", href: "/how-we-work-together" },
  { label: "Blog", href: "/blog" },
  { label: "Help", href: "/help" },
] as const;

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Refund Policy", href: "/refunds" },
  { label: "Copyright Policy", href: "/copyright" },
  { label: "Publishing Agreement", href: "/publishing-agreement-info" },
] as const;

function FooterColumn({ heading, links }: { heading: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <div className="mb-[18px] text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-accent-text)]">
        {heading}
      </div>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="mb-[11px] block text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function NarrivaFooter() {
  return (
    <footer className="border-t border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[1240px] px-8 pb-10 pt-[72px]">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <div className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-primary)]">
              Narriva
            </div>
          </div>
          <FooterColumn heading="Services" links={SERVICES} />
          <FooterColumn heading="Bookstore" links={BOOKSTORE} />
          <FooterColumn heading="Company" links={COMPANY} />
          <FooterColumn heading="Legal" links={LEGAL} />
        </div>

        <p className="mt-[54px] max-w-[560px] font-[family-name:var(--font-display)] text-[17px] italic leading-relaxed text-[var(--color-accent)]">
          We work with authors at every stage — from a rough idea to a book worth reading.
        </p>

        <div className="mt-[46px] flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-ink)]/[0.08] pt-7">
          <div className="flex gap-6">
            <a href="#" className="text-[13px] text-[var(--color-muted-3)] hover:text-[var(--color-ink)]">
              Instagram
            </a>
            <a href="#" className="text-[13px] text-[var(--color-muted-3)] hover:text-[var(--color-ink)]">
              Twitter
            </a>
            <a href="#" className="text-[13px] text-[var(--color-muted-3)] hover:text-[var(--color-ink)]">
              LinkedIn
            </a>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[13px] text-[var(--color-muted-3)]">
              © {new Date().getFullYear()} Narriva. All rights reserved.
            </span>
            <Link href="/kekere" className="text-[13px] text-[var(--color-muted-3)] hover:text-[var(--color-ink)]">
              Visit Kekere Stories
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
