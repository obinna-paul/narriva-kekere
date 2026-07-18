"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mail as MailIcon, User as UserIcon, ChevronRight } from "lucide-react";
import { hardSignOut } from "@/lib/auth/client-sign-out";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";

export interface SettingsViewProps {
  name: string;
  email: string;
  initialDeletionRequestedAt: string | null;
}

function QuickLinkRow({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[rgba(42,26,18,0.22)]"
    >
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">{label}</p>
        <p className="text-[11.5px] text-[var(--color-ink-muted-2)]">{description}</p>
      </div>
      <ChevronRight size={16} className="flex-none text-[var(--color-ink-muted-3)]" />
    </Link>
  );
}

export function SettingsView({ name, email, initialDeletionRequestedAt }: SettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/kekere/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div className="px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="mb-[26px] flex items-center gap-3">
        <Link
          href="/kekere/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]"
          aria-label="Back to profile"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          Settings
        </span>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(199,93,44,0.1)] text-[var(--color-primary)]">
          <UserIcon size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{name}</p>
          <p className="flex items-center gap-1 truncate text-[12px] text-[var(--color-ink-muted-2)]">
            <MailIcon size={11} className="flex-none" />
            {email}
          </p>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-2)]">
          Change password
        </h2>
        <form
          onSubmit={handleChangePassword}
          className="flex flex-col gap-[14px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div>
            <label htmlFor="current-password" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
              style={{ fontFamily: "inherit" }}
              required
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
              style={{ fontFamily: "inherit" }}
              required
            />
            <div className="mt-[6px] text-xs text-[var(--color-ink-muted-3)]">At least 8 characters.</div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
              style={{ fontFamily: "inherit" }}
              required
            />
          </div>

          {error && <p className="text-[12.5px] text-[#A13A3A]">{error}</p>}
          {success && <p className="text-[12.5px] font-semibold text-[var(--color-accent)]">Password updated.</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[var(--color-primary)] py-[13px] text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="mb-6 flex flex-col gap-2.5">
        <h2 className="mb-[3px] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-2)]">
          More
        </h2>
        <QuickLinkRow
          href="/kekere/profile"
          label="Edit profile"
          description="Name, bio, country, avatar, and social links"
        />
        <QuickLinkRow
          href="/kekere/notes"
          label="Notes & blocked senders"
          description="Turn notes from readers on or off, manage who's blocked"
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-red-700">Danger zone</h2>
        <DeleteAccountSection initialDeletionRequestedAt={initialDeletionRequestedAt} />
      </section>

      <button
        type="button"
        onClick={() => hardSignOut("/kekere")}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(193,58,58,0.22)] bg-transparent py-[14px] text-[14px] font-semibold text-[#A13A3A] transition-colors hover:bg-[rgba(193,58,58,0.06)]"
      >
        Log out
      </button>
    </div>
  );
}
