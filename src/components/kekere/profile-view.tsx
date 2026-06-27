"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type StoryStatus = "DRAFT" | "SUBMITTED" | "REVIEWING" | "REVISIONS_REQUESTED" | "PUBLISHED" | "REJECTED";

export interface MyStorySummary {
  id: string;
  title: string;
  status: StoryStatus;
}

const STATUS_STYLES: Record<StoryStatus, string> = {
  DRAFT: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  SUBMITTED: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVIEWING: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVISIONS_REQUESTED: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
  PUBLISHED: "bg-[rgba(31,111,74,0.12)] text-[var(--color-success)]",
  REJECTED: "bg-[rgba(193,58,58,0.12)] text-[#A13A3A]",
};

const STATUS_LABELS: Record<StoryStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Revisions requested",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
};

const EDITABLE_STATUSES: StoryStatus[] = ["DRAFT", "REVISIONS_REQUESTED"];

function formatStat(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1)}k`;
  }
  return n.toString();
}

function StatCard({ value, label, accent }: { value: string; label: string; accent: "orange" | "teal" }) {
  return (
    <div className="rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-3 py-[18px] text-center">
      <div
        className={cn(
          "font-[family-name:var(--font-display)] text-[26px] font-semibold leading-none",
          accent === "orange" ? "text-[var(--color-primary)]" : "text-[var(--color-accent)]"
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[11.5px] leading-[1.3] text-[var(--color-ink-muted-2)]">{label}</div>
    </div>
  );
}

export interface ProfileViewProps {
  name: string;
  email: string;
  bio: string;
  avatarColor: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  hasAuthoredAnyStory: boolean;
  writingStats: { publishedCount: number; totalReads: number; cowriesEarned: number };
  readingStats: { storiesRead: number; savedCount: number };
  myStories: readonly MyStorySummary[];
}

export function ProfileView(props: ProfileViewProps) {
  const [name, setName] = useState(props.name);
  const [bio, setBio] = useState(props.bio);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftBankName, setDraftBankName] = useState(props.bankName ?? "");
  const [draftBankAccountNumber, setDraftBankAccountNumber] = useState(props.bankAccountNumber ?? "");
  const [draftBankAccountName, setDraftBankAccountName] = useState(props.bankAccountName ?? "");
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setDraftName(name);
    setDraftBio(bio);
    setDraftBankName(props.bankName ?? "");
    setDraftBankAccountNumber(props.bankAccountNumber ?? "");
    setDraftBankAccountName(props.bankAccountName ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await fetch("/api/kekere/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          bio: draftBio,
          bankName: draftBankName,
          bankAccountNumber: draftBankAccountNumber,
          bankAccountName: draftBankAccountName,
        }),
      });
    } catch {
      // Persisted locally regardless
    }

    setName(draftName);
    setBio(draftBio);
    setSaving(false);
    setEditing(false);
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      {editing ? (
        <div className="px-[22px] pt-[18px]">
          <div className="mb-[26px] flex items-center justify-between">
            <button
              type="button"
              onClick={cancelEdit}
              className="cursor-pointer bg-none text-[15px] text-[var(--color-ink-muted-2)]"
              style={{ background: "none", border: "none" }}
            >
              Cancel
            </button>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
              Edit profile
            </span>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={saving}
              className="cursor-pointer bg-none text-[15px] font-semibold text-[var(--color-primary)] disabled:opacity-50"
              style={{ background: "none", border: "none" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="mb-[26px] text-center">
            <div
              className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[30px] font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, #E08A4A, ${props.avatarColor})`,
              }}
            >
              {initial}
            </div>
            <button
              type="button"
              className="mt-3 cursor-pointer bg-none text-[13.5px] font-semibold text-[var(--color-primary)]"
              style={{ background: "none", border: "none" }}
            >
              Change photo
            </button>
          </div>

          <form id="edit-profile-form" onSubmit={saveEdit} className="flex flex-col gap-[18px]">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
              >
                Name
              </label>
              <input
                id="profile-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                style={{ fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label
                htmlFor="profile-bio"
                className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
              >
                Bio
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                maxLength={160}
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <div className="mt-[6px] text-right text-xs text-[var(--color-ink-muted-3)]">
                {draftBio.length} / 160
              </div>
            </div>

            <div className="border-t border-[rgba(42,26,18,0.1)] pt-[18px]">
              <p className="mb-[14px] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted-2)]">
                Bank details for withdrawals
              </p>
              <div className="flex flex-col gap-[14px]">
                <div>
                  <label htmlFor="profile-bank-name" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
                    Bank name
                  </label>
                  <input
                    id="profile-bank-name"
                    value={draftBankName}
                    onChange={(e) => setDraftBankName(e.target.value)}
                    placeholder="e.g. GTBank, Access, First Bank"
                    className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                    style={{ fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label htmlFor="profile-bank-number" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
                    Account number
                  </label>
                  <input
                    id="profile-bank-number"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={draftBankAccountNumber}
                    onChange={(e) => setDraftBankAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0123456789"
                    className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                    style={{ fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label htmlFor="profile-bank-account-name" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
                    Account name
                  </label>
                  <input
                    id="profile-bank-account-name"
                    value={draftBankAccountName}
                    onChange={(e) => setDraftBankAccountName(e.target.value)}
                    placeholder="Name on the bank account"
                    className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                    style={{ fontFamily: "inherit" }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <>
          <section className="px-[22px] pb-[30px] pt-[44px] text-center">
            <div
              className="mx-auto flex h-[96px] w-[96px] items-center justify-center rounded-full p-1"
              style={{ background: props.avatarColor }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[34px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, #E08A4A, ${props.avatarColor})`,
                }}
              >
                {initial}
              </div>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[26px] font-semibold text-[var(--color-ink)]">
              {name || "Unnamed"}
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-[14.5px] leading-[1.5] text-[var(--color-ink-muted)]">
              {bio || "No bio yet."}
            </p>
            <button
              type="button"
              onClick={openEdit}
              className="mt-[18px] cursor-pointer rounded-[30px] border border-[rgba(42,26,18,0.16)] bg-transparent px-6 py-[10px] text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              style={{ background: "none" }}
            >
              Edit profile
            </button>
          </section>

          <section className="px-[22px]">
            {props.hasAuthoredAnyStory && (
              <>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
                  As a writer
                </div>
                <div className="mb-6 grid grid-cols-3 gap-[10px]">
                  <StatCard
                    value={String(props.writingStats.publishedCount)}
                    label="Published stories"
                    accent="orange"
                  />
                  <StatCard
                    value={formatStat(props.writingStats.totalReads)}
                    label="Total reads"
                    accent="orange"
                  />
                  <StatCard
                    value={formatStat(props.writingStats.cowriesEarned)}
                    label="Cowries earned"
                    accent="orange"
                  />
                </div>
              </>
            )}

            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
              As a reader
            </div>
            <div className="mb-6 grid grid-cols-2 gap-[10px]">
              <StatCard
                value={String(props.readingStats.storiesRead)}
                label="Stories read"
                accent="teal"
              />
              <StatCard
                value={String(props.readingStats.savedCount)}
                label="Stories saved"
                accent="teal"
              />
            </div>

            <Link
              href="/kekere/library"
              className="mb-6 flex items-center justify-center rounded-xl bg-[rgba(199,93,44,0.08)] px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-primary)]"
            >
              Go to my library &rarr;
            </Link>

            {props.hasAuthoredAnyStory && props.myStories.length > 0 && (
              <div className="flex flex-col gap-2">
                {props.myStories.map((story) => {
                  const href = EDITABLE_STATUSES.includes(story.status)
                    ? `/kekere/write?id=${story.id}`
                    : `/kekere/story/${story.id}`;
                  return (
                    <Link
                      key={story.id}
                      href={href}
                      className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[rgba(42,26,18,0.08)] transition-colors hover:ring-[var(--color-primary)]/40"
                    >
                      <span className="font-medium text-[var(--color-ink)]">
                        {story.title || "Untitled story"}
                      </span>
                      <span
                        className={cn(
                          "flex-none rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          STATUS_STYLES[story.status]
                        )}
                      >
                        {STATUS_LABELS[story.status]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}