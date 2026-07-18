"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Link2, Gift } from "lucide-react";
import { hardSignOut } from "@/lib/auth/client-sign-out";
import { cn } from "@/lib/utils/cn";
import { BankDetailsSection, type BankDetailsProp } from "@/components/kekere/bank-details-section";
import { AvatarCropModal } from "@/components/kekere/avatar-crop-modal";
import { StreakCard, type StreakCardProps } from "@/components/kekere/streak-card";

/** "Label|https://url" per line — same plain-text convention as the admin's
 * Narriva author-form social links editor (src/components/admin/author-form.tsx),
 * kept simple rather than building a repeatable-fields UI for a handful of links. */
function parseSocialLinks(text: string): { label: string; href: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return { label: label || href, href: href || label };
    });
}

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
  userId: string;
  name: string;
  email: string;
  bio: string;
  country: string | null;
  avatarColor: string;
  avatarUrl: string | null;
  socialLinks: readonly { label: string; href: string }[];
  bankDetails: BankDetailsProp | null;
  hasAuthoredAnyStory: boolean;
  writingStats: { publishedCount: number; totalReads: number };
  readingStats: { storiesRead: number; storiesCompleted: number; savedCount: number };
  streakStats: StreakCardProps;
}

export function ProfileView(props: ProfileViewProps) {
  const [name, setName] = useState(props.name);
  const [bio, setBio] = useState(props.bio);
  const [country, setCountry] = useState(props.country ?? "");
  const [socialLinks, setSocialLinks] = useState(props.socialLinks);
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftSocialLinksText, setDraftSocialLinksText] = useState(
    socialLinks.map((l) => `${l.label}|${l.href}`).join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    setDraftName(name);
    setDraftBio(bio);
    setDraftCountry(country);
    setDraftSocialLinksText(socialLinks.map((l) => `${l.label}|${l.href}`).join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const parsedSocialLinks = parseSocialLinks(draftSocialLinksText);

    try {
      await fetch("/api/kekere/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          bio: draftBio,
          country: draftCountry.trim() || null,
          socialLinks: parsedSocialLinks,
        }),
      });
    } catch {
      // Persisted locally regardless
    }

    setName(draftName);
    setBio(draftBio);
    setCountry(draftCountry.trim());
    setSocialLinks(parsedSocialLinks);
    setSaving(false);
    setEditing(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    setAvatarError(null);

    // react-easy-crop has no built-in handling for an image that fails to
    // decode — it just silently renders the crop circle with nothing inside
    // it, with zero indication anything went wrong. Confirm the browser can
    // actually decode this file into an image *before* ever opening the
    // crop screen, so a bad photo gets a clear error instead of a dead end.
    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => setCropSrc(objectUrl);
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setAvatarError("Couldn't open that photo. Try a different image.");
    };
    probe.src = objectUrl;
  }

  function closeCropModal() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(blob: Blob) {
    closeCropModal();
    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append("image", blob, "avatar.jpg");
      const res = await fetch("/api/kekere/profile/avatar", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      } else {
        setAvatarError(data?.error ?? "Couldn't upload photo. Please try again.");
      }
    } catch {
      setAvatarError("Couldn't upload photo — check your connection and try again.");
    }
    setUploadingAvatar(false);
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      {editing ? (
        <div className="px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-[18px]">
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div
              className="mx-auto flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[30px] font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, #E08A4A, ${props.avatarColor})`,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 cursor-pointer bg-none text-[13.5px] font-semibold text-[var(--color-primary)] disabled:opacity-50"
              style={{ background: "none", border: "none" }}
            >
              {uploadingAvatar ? "Uploading…" : "Change photo"}
            </button>
            {avatarError && <p className="mt-2 text-[12.5px] text-[#A13A3A]">{avatarError}</p>}
          </div>

          {cropSrc && (
            <AvatarCropModal imageSrc={cropSrc} onCancel={closeCropModal} onConfirm={handleCropConfirm} />
          )}

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
            <div>
              <label
                htmlFor="profile-country"
                className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
              >
                Country
              </label>
              <input
                id="profile-country"
                value={draftCountry}
                onChange={(e) => setDraftCountry(e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                maxLength={80}
                className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <div className="mt-[6px] text-xs text-[var(--color-ink-muted-3)]">
                Shown on your public writer profile, if you have one.
              </div>
            </div>
            <div>
              <label
                htmlFor="profile-social-links"
                className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
              >
                Social links
              </label>
              <textarea
                id="profile-social-links"
                rows={3}
                value={draftSocialLinksText}
                onChange={(e) => setDraftSocialLinksText(e.target.value)}
                placeholder={"Instagram|https://instagram.com/you\nX|https://x.com/you"}
                className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <div className="mt-[6px] text-xs text-[var(--color-ink-muted-3)]">
                One per line, as Label|https://url. Up to 5.
              </div>
            </div>
          </form>
        </div>
      ) : (
        <>
          <section className="px-[22px] pb-[30px] pt-[44px] text-center">
            <div
              className="mx-auto flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full p-1"
              style={{ background: props.avatarColor }}
            >
              <div
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[34px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, #E08A4A, ${props.avatarColor})`,
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[26px] font-semibold text-[var(--color-ink)]">
              {name || "Unnamed"}
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-[14.5px] leading-[1.5] text-[var(--color-ink-muted)]">
              {bio || "No bio yet."}
            </p>

            {socialLinks.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-[8px]">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-[rgba(42,26,18,0.12)] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40"
                  >
                    <Link2 size={12} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}

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
            <StreakCard {...props.streakStats} />

            {props.hasAuthoredAnyStory && (
              <>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
                  As a writer
                </div>
                <div className="mb-6 grid grid-cols-2 gap-[10px]">
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
                </div>
                {props.writingStats.publishedCount > 0 && (
                  <Link
                    href={`/kekere/writer/${props.userId}`}
                    className="mb-6 flex items-center justify-center rounded-xl bg-[rgba(199,93,44,0.08)] px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-primary)]"
                  >
                    View your public profile &rarr;
                  </Link>
                )}
              </>
            )}

            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
              As a reader
            </div>
            <div className="mb-6 grid grid-cols-3 gap-[10px]">
              <StatCard
                value={String(props.readingStats.storiesRead)}
                label="Stories read"
                accent="teal"
              />
              <StatCard
                value={String(props.readingStats.storiesCompleted)}
                label="Completed"
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
              className="mb-3 flex items-center justify-center rounded-xl bg-[rgba(199,93,44,0.08)] px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-primary)]"
            >
              Go to my library &rarr;
            </Link>

            <Link
              href="/kekere/invite"
              className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-[rgba(31,75,75,0.08)] px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-accent)]"
            >
              <Gift size={16} />
              Invite friends, earn cowries &rarr;
            </Link>
          </section>

          <BankDetailsSection bankDetails={props.bankDetails} />

          <div className="px-[22px] pb-[100px] pt-[10px]">
            <button
              type="button"
              onClick={() => hardSignOut("/kekere")}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(193,58,58,0.22)] bg-transparent py-[14px] text-[14px] font-semibold text-[#A13A3A] transition-colors hover:bg-[rgba(193,58,58,0.06)]"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </>
      )}
    </>
  );
}