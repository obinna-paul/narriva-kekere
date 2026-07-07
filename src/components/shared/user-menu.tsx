"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { hardSignOut } from "@/lib/auth/client-sign-out";
import { cn } from "@/lib/utils/cn";

export interface UserMenuProps {
  name: string;
  email?: string;
  brand?: "narriva" | "kekere";
}

export function UserMenu({ name, email, brand = "narriva" }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const isKekere = brand === "kekere";
  const profileHref = isKekere ? "/kekere/profile" : "/portal";
  const profileLabel = isKekere ? "Profile" : "Portal";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-none font-[family-name:var(--font-display)] text-sm font-semibold text-white transition-opacity hover:opacity-80"
        style={{ background: "var(--color-primary)" }}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[200px] rounded-xl border border-[rgba(42,26,18,0.1)] bg-white p-2 shadow-[0_12px_32px_-12px_rgba(42,26,18,0.3)]">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{name}</p>
            {email && (
              <p className="text-xs text-[var(--color-ink-muted)]">{email}</p>
            )}
          </div>

          <div className="my-1 border-t border-[rgba(42,26,18,0.08)]" />

          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[rgba(42,26,18,0.04)]"
          >
            {profileLabel}
          </Link>
          {!isKekere && (
            <Link
              href="/account/library"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[rgba(42,26,18,0.04)]"
            >
              My Library
            </Link>
          )}
          {isKekere && (
            <Link
              href="/kekere/library"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[rgba(42,26,18,0.04)]"
            >
              My Library
            </Link>
          )}

          <div className="my-1 border-t border-[rgba(42,26,18,0.08)]" />

          <button
            type="button"
            onClick={() => hardSignOut(isKekere ? "/kekere" : "/")}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#A13A3A] transition-colors hover:bg-[rgba(193,58,58,0.06)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
