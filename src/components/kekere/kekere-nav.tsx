"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BookOpen, PenLine, Trophy, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BottomNav } from "@/components/kekere/bottom-nav";
import { UserMenu } from "@/components/shared/user-menu";
import { NotificationBell } from "@/components/kekere/NotificationBell";

const NAV_ITEMS = [
  { href: "/kekere/feed", label: "Feed", icon: BookOpen },
  { href: "/kekere/write", label: "Write", icon: PenLine },
  { href: "/kekere/competitions", label: "Competitions", icon: Trophy },
  { href: "/kekere/wallet", label: "Wallet", icon: Wallet },
] as const;

export interface KekereNavProps {
  user?: { name: string; email?: string } | null;
}

export function KekereNav({ user }: KekereNavProps = {}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile has no shared top bar today — BottomNav (5 items already)
          covers primary nav, so rather than crowd it or bump an existing
          destination for notifications, this adds a minimal top strip
          (logo + bell) that only appears for logged-in users. */}
      {user && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 backdrop-blur-sm md:hidden">
          <Link href="/kekere/feed" className="inline-block">
            <Image src="/kekere-logo.png" alt="Kekere Stories" width={32} height={32} className="h-8 w-auto" />
          </Link>
          <NotificationBell />
        </header>
      )}

      <header className="sticky top-0 z-40 hidden border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/kekere/feed" className="inline-block">
            <Image
              src="/kekere-logo.png"
              alt="Kekere Stories"
              width={40}
              height={40}
              className="h-[40px] w-auto"
            />
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
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/30"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-primary)]"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            {user && <NotificationBell />}
            {user && <UserMenu name={user.name} email={user.email} brand="kekere" />}
          </nav>
        </div>
      </header>
      <BottomNav />
    </>
  );
}
