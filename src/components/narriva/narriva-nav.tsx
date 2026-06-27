"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/shared/user-menu";

const SERVICES = [
  { label: "Publishing", href: "/services/publishing" },
  { label: "Editorial", href: "/services/editorial" },
  { label: "Design", href: "/services/design" },
  { label: "Author Growth", href: "/services/author-growth" },
  { label: "Ghostwriting", href: "/services/ghostwriting" },
] as const;

export interface NarrivaNavProps {
  /** Signed-in users see "Library" + an avatar initial instead of
   * "Sign in" + "Submit Your Manuscript", per the Library screen's nav
   * state in the design handoff. */
  user?: { name: string; email?: string } | null;
}

/** Sticky global nav — gains a faint drop shadow once the page scrolls past
 * 12px, per the design handoff's `navShadow` state. */
export function NarrivaNav({ user }: NarrivaNavProps = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[var(--color-ink)]/[0.07] bg-[var(--color-bg)]/[0.44] backdrop-blur-md"
      style={{
        boxShadow: scrolled
          ? "0 14px 14px -14px rgba(22,22,22,0.05)"
          : "0 14px 14px -14px rgba(22,22,22,0)",
        transition: "box-shadow 0.3s",
      }}
    >
      <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-[var(--color-primary)]"
        >
          Narriva
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          <Link href="/books" className="text-[15px] text-[var(--color-ink)]">
            Books
          </Link>

          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[15px] text-[var(--color-ink)]"
            >
              Services
              <span className="translate-y-px text-[9px] opacity-50">▾</span>
            </button>
            {servicesOpen && (
              <div className="absolute left-[-18px] top-full pt-3.5">
                <div className="w-[212px] rounded border border-[var(--color-ink)]/[0.09] bg-[var(--color-bg)] p-2.5 shadow-[0_18px_50px_-12px_rgba(22,22,22,0.18)]">
                  {SERVICES.map((svc) => (
                    <Link
                      key={svc.href}
                      href={svc.href}
                      className="block rounded-[3px] px-3.5 py-2.5 text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-primary)]/[0.06] hover:text-[var(--color-primary)]"
                    >
                      {svc.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/authors" className="text-[15px] text-[var(--color-ink)]">
            Authors
          </Link>
          <Link href="/blog" className="text-[15px] text-[var(--color-ink)]">
            Blog
          </Link>

          <div className="h-[22px] w-px bg-[var(--color-ink)]/[0.12]" />

          {user ? (
            <UserMenu name={user.name} email={user.email} brand="narriva" />
          ) : (
            <>
              <Link href="/login?brand=narriva" className="text-[15px] text-[var(--color-ink)]">
                Sign in
              </Link>
              <Link
                href="/submit"
                className={cn(buttonVariants({ size: "sm" }), "px-5 py-[11px] text-sm tracking-[0.01em]")}
              >
                Submit Your Manuscript
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
