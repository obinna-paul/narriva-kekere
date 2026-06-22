import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { Container } from "@/components/ui/layout";

// Route protection for everything under /admin lives in src/middleware.ts
// (redirects unauthenticated visitors to /login, non-admins to "/").

const NAV_LINKS = [
  { href: "/admin/books", label: "Books" },
  { href: "/admin/authors", label: "Authors" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/kekere/stories", label: "Kekere Stories" },
  { href: "/admin/kekere/competitions", label: "Kekere Competitions" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NarrivaTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <header className="border-b border-[var(--color-ink)]/10">
          <Container>
            <div className="flex h-16 items-center justify-between">
              <Link href="/admin/books" className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Narriva Admin
              </Link>
              <nav aria-label="Admin sections" className="flex gap-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-[var(--color-ink)]/70 hover:text-[var(--color-primary)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link href="/" className="text-sm text-[var(--color-ink)]/50 hover:underline">
                Back to site
              </Link>
            </div>
          </Container>
        </header>
        <Container className="py-10">{children}</Container>
      </div>
    </NarrivaTheme>
  );
}
