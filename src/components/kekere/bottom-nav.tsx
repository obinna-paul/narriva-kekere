"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PenLine, Trophy, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/kekere/feed", label: "Feed", icon: BookOpen },
  { href: "/kekere/write", label: "Write", icon: PenLine },
  { href: "/kekere/competitions", label: "Compete", icon: Trophy },
  { href: "/kekere/wallet", label: "Wallet", icon: Wallet },
  { href: "/kekere/profile", label: "Profile", icon: User },
] as const;

/** Mobile-only bottom tab bar — Kekere's primary navigation pattern, with
 * no desktop equivalent in look (see KekereNav for the desktop header). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-ink)]/10 bg-[var(--color-bg)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch justify-between">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-[var(--color-primary)]" : "text-[var(--color-ink)]/50"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
