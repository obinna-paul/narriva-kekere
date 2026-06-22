"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NavProps {
  /** Brand logo/wordmark — Narriva and Kekere each supply their own. */
  logo: ReactNode;
  /** Nav links, rendered both in the desktop bar and the mobile panel. */
  links: ReactNode;
  /** Optional trailing actions (e.g. a login button), desktop bar only. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Brand-neutral responsive nav shell: logo slot, links slot, and an
 * accessible mobile disclosure (hamburger) panel. Narriva and Kekere supply
 * their own links/styling on top of this in their respective phases — this
 * component owns only structure and interaction, no brand colours.
 */
export function Nav({ logo, links, actions, className }: NavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <header
      className={cn(
        "border-b border-[var(--color-ink)]/10 bg-[var(--color-bg)] text-[var(--color-ink)]",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">{logo}</div>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {links}
        </nav>

        <div className="hidden items-center gap-3 md:flex">{actions}</div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      <div
        id={panelId}
        className={cn(
          "border-t border-[var(--color-ink)]/10 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav aria-label="Primary" className="flex flex-col gap-4 px-4 py-4 sm:px-6">
          {links}
          {actions && <div className="flex flex-col gap-3 pt-2">{actions}</div>}
        </nav>
      </div>
    </header>
  );
}
