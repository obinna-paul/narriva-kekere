"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PenLine, Trophy, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BottomNav } from "@/components/kekere/bottom-nav";

const NAV_ITEMS = [
  { href: "/kekere/feed", label: "Feed", icon: BookOpen },
  { href: "/kekere/write", label: "Write", icon: PenLine },
  { href: "/kekere/competitions", label: "Competitions", icon: Trophy },
  { href: "/kekere/wallet", label: "Wallet", icon: Wallet },
  { href: "/kekere/profile", label: "Profile", icon: User },
] as const;

/**
 * Desktop header nav + the mobile bottom tab bar, same five destinations.
 * Kekere has no shared chrome with Narriva — this is the only nav this
 * product uses, app-style rather than a marketing site header.
 */
export function KekereNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-[var(--color-ink)]/10 bg-[var(--color-bg)] md:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/kekere/feed"
            className="text-lg font-bold tracking-tight text-[var(--color-primary)]"
          >
            kekere
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                      : "text-[var(--color-ink)]/70 hover:bg-[var(--color-ink)]/5"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <BottomNav />
    </>
  );
}
