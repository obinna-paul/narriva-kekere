"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut, Link2, Gift, Mail, BookOpen, Eye, ChevronRight, Share2, Star, BarChart3 } from "lucide-react";
import { hardSignOut } from "@/lib/auth/client-sign-out";
import { cn } from "@/lib/utils/cn";
import { BankDetailsSection, type BankDetailsProp } from "@/components/kekere/bank-details-section";
import { AvatarCropModal } from "@/components/kekere/avatar-crop-modal";
import { StreakCard, type StreakCardProps } from "@/components/kekere/streak-card";
import { ShareProfileSheet } from "@/components/kekere/share-profile-sheet";
import type { RatingSummary } from "@/lib/data/kekere-ratings";
import { SITE_URL } from "@/content/decisions";

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

/** Small uppercase group label, used consistently above every card on the
 *  page so the eye can scan section-to-section the same way every time. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
      {children}
    </div>
  );
}

/** Lighter-weight label for a sub-group *inside* a card (e.g. "Writing" vs
 *  "Reading" within one Stats card) — a step down from SectionLabel so the
 *  hierarchy between "this is a section" and "this is a subdivision of one"
 *  stays legible. */
function CardSubLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-3)]">
      {children}
    </div>
  );
}

/** The one card shape used everywhere on this page — padded content. */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white p-4", className)}>
      {children}
    </div>
  );
}

/** The one "grouped list" card shape — a set of full-width rows separated
 *  by hairlines instead of each row being its own separately-tinted pill
 *  floating on the page background. */
function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white">{children}</div>
  );
}

function ListRow({
  href,
  onClick,
  icon,
  tone,
  label,
  trailing,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  tone: "primary" | "accent" | "neutral";
  label: ReactNode;
  trailing?: ReactNode;
}) {
  const toneClasses = {
    primary: "bg-[rgba(199,93,44,0.1)] text-[var(--color-primary)]",
    accent: "bg-[rgba(31,75,75,0.1)] text-[var(--color-accent)]",
    neutral: "bg-[rgba(42,26,18,0.06)] text-[var(--color-ink-muted)]",
  }[tone];

  const className =
    "flex w-full items-center gap-3 border-b border-[rgba(42,26,18,0.06)] px-4 py-[13px] text-left transition-colors last:border-b-0 hover:bg-[rgba(42,26,18,0.02)] active:bg-[rgba(42,26,18,0.04)]";

  const content = (
    <>
      <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-full", toneClasses)}>
        {icon}
      </span>
      <span className="flex-1 text-[14.5px] font-semibold text-[var(--color-ink)]">{label}</span>
      {trailing}
      <ChevronRight size={16} className="flex-none text-[var(--color-ink-muted-3)]" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function StatBlock({ value, label, accent }: { value: string; label: string; accent: "orange" | "teal" }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "font-[family-name:var(--font-display)] text-[22px] font-semibold leading-none",
          accent === "orange" ? "text-[var(--color-primary)]" : "text-[var(--color-accent)]"
        )}
      >
        {value}
      </div>
      <div className="mt-[6px] text-[11px] leading-[1.3] text-[var(--color-ink-muted-2)]">{label}</div>
    </div>
  );
}

/** One card in the "Following" grid — avatar, name, then stats below in
 *  place of a follower count (which means nothing to a reader browsing who
 *  *they* follow): published story count, plus a star rating once the
 *  writer has any. Whole card links to the writer's profile, where
 *  unfollowing already lives (via FollowButton on writer-follow-header). */
function FollowingCard({
  writer,
}: {
  writer: {
    id: string;
    name: string;
    avatarColor: string | null;
    avatarUrl: string | null;
    publishedCount: number;
    rating: RatingSummary;
  };
}) {
  const initial = writer.name.trim().charAt(0).toUpperCase() || "?";
  const storyLabel = `${writer.publishedCount} ${writer.publishedCount === 1 ? "story" : "stories"}`;

  return (
    <Link href={`/kekere/writer/${writer.id}`} className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="flex h-[58px] w-[58px] flex-none items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[19px] font-semibold text-white"
        style={{ background: `linear-gradient(135deg, #E08A4A, ${writer.avatarColor ?? "#C75D2C"})` }}
      >
        {writer.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={writer.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <span className="w-full truncate text-[12.5px] font-semibold text-[var(--color-ink)]">{writer.name}</span>
      <span className="flex items-center gap-1 text-[11px] text-[var(--color-ink-muted-2)]">
        {storyLabel}
        {writer.rating.count > 0 && writer.rating.average !== null && (
          <>
            <span aria-hidden>·</span>
            <Star size={10} className="fill-current text-[var(--color-primary)]" />
            {writer.rating.average.toFixed(1)}
          </>
        )}
      </span>
    </Link>
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
  kekereUsername: string | null;
  currentlyWriting: string;
  crossPromotionEnabled: boolean;
  bankDetails: BankDetailsProp | null;
  hasAuthoredAnyStory: boolean;
  writingStats: { publishedCount: number; totalReads: number };
  readingStats: { storiesRead: number; storiesCompleted: number; savedCount: number };
  streakStats: StreakCardProps;
  unreadNoteCount: number;
  followingWriters: readonly {
    id: string;
    name: string;
    avatarColor: string | null;
    avatarUrl: string | null;
    publishedCount: number;
    rating: RatingSummary;
  }[];
}

export function ProfileView(props: ProfileViewProps) {
  const [name, setName] = useState(props.name);
  const [bio, setBio] = useState(props.bio);
  const [country, setCountry] = useState(props.country ?? "");
  const [socialLinks, setSocialLinks] = useState(props.socialLinks);
  const [kekereUsername, setKekereUsername] = useState(props.kekereUsername ?? "");
  const [currentlyWriting, setCurrentlyWriting] = useState(props.currentlyWriting);
  const [crossPromotionEnabled, setCrossPromotionEnabled] = useState(props.crossPromotionEnabled);
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftUsername, setDraftUsername] = useState(kekereUsername);
  const [draftCurrentlyWriting, setDraftCurrentlyWriting] = useState(currentlyWriting);
  const [draftCrossPromotionEnabled, setDraftCrossPromotionEnabled] = useState(crossPromotionEnabled);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftSocialLinksText, setDraftSocialLinksText] = useState(
    socialLinks.map((l) => `${l.label}|${l.href}`).join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    setDraftName(name);
    setDraftBio(bio);
    setDraftCountry(country);
    setDraftUsername(kekereUsername);
    setDraftCurrentlyWriting(currentlyWriting);
    setDraftCrossPromotionEnabled(crossPromotionEnabled);
    setUsernameError(null);
    setSaveError(null);
    setDraftSocialLinksText(socialLinks.map((l) => `${l.label}|${l.href}`).join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setUsernameError(null);
    setSaveError(null);

    const parsedSocialLinks = parseSocialLinks(draftSocialLinksText);
    const normalizedUsername = draftUsername.trim().toLowerCase();

    try {
      const res = await fetch("/api/kekere/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          bio: draftBio,
          country: draftCountry.trim() || null,
          socialLinks: parsedSocialLinks,
          kekereUsername: normalizedUsername || null,
          currentlyWriting: draftCurrentlyWriting.trim() || null,
          crossPromotionEnabled: draftCrossPromotionEnabled,
        }),
      });
      // A failed save must never be treated as a success — this used to fall
      // through to the optimistic update below for any error other than
      // "taken"/"invalid_format" (e.g. a server error), silently showing
      // "saved" in the UI for a change that never actually persisted.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "taken") {
          setUsernameError("That username is taken — try another.");
        } else if (data.error === "invalid_format") {
          setUsernameError("3-24 characters: lowercase letters, numbers, and single hyphens only.");
        } else {
          setSaveError("Couldn't save your changes — try again in a moment.");
        }
        setSaving(false);
        return;
      }
    } catch {
      setSaveError("Couldn't save your changes — check your connection and try again.");
      setSaving(false);
      return;
    }

    setName(draftName);
    setBio(draftBio);
    setCountry(draftCountry.trim());
    setSocialLinks(parsedSocialLinks);
    setKekereUsername(normalizedUsername);
    setCurrentlyWriting(draftCurrentlyWriting.trim());
    setCrossPromotionEnabled(draftCrossPromotionEnabled);
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

          {saveError && (
            <div className="mb-[18px] rounded-[10px] border border-[rgba(193,58,58,0.22)] bg-[rgba(193,58,58,0.06)] px-[15px] py-[11px] text-[13.5px] text-[#A13A3A]">
              {saveError}
            </div>
          )}

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
                Brief author bio
              </label>
              <textarea
                id="profile-bio"
                rows={4}
                maxLength={280}
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                placeholder="A couple of sentences readers will see on your public profile and shareable profile card."
                className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <div className="mt-[6px] text-right text-xs text-[var(--color-ink-muted-3)]">
                {draftBio.length} / 280
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

            {props.hasAuthoredAnyStory && props.writingStats.publishedCount > 0 && (
              <>
                <div>
                  <label
                    htmlFor="profile-username"
                    className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
                  >
                    Profile link
                  </label>
                  <div className="flex items-center overflow-hidden rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white transition-colors focus-within:border-[var(--color-primary)]">
                    <span className="flex-none pl-[15px] text-[13.5px] text-[var(--color-ink-muted-2)]">
                      {SITE_URL.replace("https://", "")}/kekere/writer/
                    </span>
                    <input
                      id="profile-username"
                      value={draftUsername}
                      onChange={(e) => setDraftUsername(e.target.value.toLowerCase())}
                      placeholder="yourname"
                      maxLength={24}
                      className="min-w-0 flex-1 bg-transparent py-[13px] pl-1 pr-[15px] text-[15px] text-[var(--color-ink)] focus:outline-none"
                      style={{ fontFamily: "inherit" }}
                    />
                  </div>
                  <div className="mt-[6px] text-xs text-[var(--color-ink-muted-3)]">
                    A memorable link for your public profile — used on your shareable card too. Leave blank to keep
                    the default link.
                  </div>
                  {usernameError && <p className="mt-[6px] text-xs text-[#A13A3A]">{usernameError}</p>}
                </div>

                <div>
                  <label
                    htmlFor="profile-currently-writing"
                    className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]"
                  >
                    Currently writing
                  </label>
                  <input
                    id="profile-currently-writing"
                    value={draftCurrentlyWriting}
                    onChange={(e) => setDraftCurrentlyWriting(e.target.value)}
                    placeholder="e.g. A quiet story about Lagos traffic and second chances"
                    maxLength={140}
                    className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
                    style={{ fontFamily: "inherit" }}
                  />
                  <div className="mt-[6px] text-xs text-[var(--color-ink-muted-3)]">
                    A &ldquo;coming soon&rdquo; teaser shown on your public profile. Leave blank to hide it.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px]">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--color-ink)]">Cross-promotion</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted-3)]">
                      Show similar writers on your profile, and let them recommend you on theirs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraftCrossPromotionEnabled((v) => !v)}
                    className={cn(
                      "relative h-6 w-11 flex-none rounded-full transition-colors",
                      draftCrossPromotionEnabled ? "bg-[var(--color-primary)]" : "bg-[rgba(42,26,18,0.15)]",
                    )}
                    aria-label={draftCrossPromotionEnabled ? "Turn cross-promotion off" : "Turn cross-promotion on"}
                  >
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        draftCrossPromotionEnabled ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </>
            )}
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

          <section className="flex flex-col gap-6 px-[22px]">
            <StreakCard {...props.streakStats} />

            <div>
              <SectionLabel>Stats</SectionLabel>
              <Card className="flex flex-col gap-4">
                {props.hasAuthoredAnyStory && (
                  <div className="border-b border-[rgba(42,26,18,0.07)] pb-4">
                    <CardSubLabel>Writing</CardSubLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <StatBlock
                        value={String(props.writingStats.publishedCount)}
                        label="Published stories"
                        accent="orange"
                      />
                      <StatBlock
                        value={formatStat(props.writingStats.totalReads)}
                        label="Total reads"
                        accent="orange"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <CardSubLabel>Reading</CardSubLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <StatBlock value={String(props.readingStats.storiesRead)} label="Stories read" accent="teal" />
                    <StatBlock value={String(props.readingStats.storiesCompleted)} label="Completed" accent="teal" />
                    <StatBlock value={String(props.readingStats.savedCount)} label="Stories saved" accent="teal" />
                  </div>
                </div>
              </Card>
            </div>

            {props.followingWriters.length > 0 && (
              <div>
                <SectionLabel>Following ({props.followingWriters.length})</SectionLabel>
                <Card className="p-4">
                  <div className="grid grid-cols-3 gap-x-2 gap-y-5">
                    {props.followingWriters.map((writer) => (
                      <FollowingCard key={writer.id} writer={writer} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div>
              <SectionLabel>Quick actions</SectionLabel>
              <ListCard>
                {props.hasAuthoredAnyStory && (
                  <ListRow
                    href="/kekere/analytics"
                    icon={<BarChart3 size={15} />}
                    tone="primary"
                    label="Analytics & earnings"
                  />
                )}
                {props.hasAuthoredAnyStory && props.writingStats.publishedCount > 0 && (
                  <>
                    <ListRow
                      href={`/kekere/writer/${kekereUsername || props.userId}`}
                      icon={<Eye size={15} />}
                      tone="primary"
                      label="View your public profile"
                    />
                    <ListRow
                      onClick={() => setShareSheetOpen(true)}
                      icon={<Share2 size={15} />}
                      tone="primary"
                      label="Share profile"
                    />
                  </>
                )}
                <ListRow href="/kekere/library" icon={<BookOpen size={15} />} tone="primary" label="My library" />
                <ListRow
                  href="/kekere/notes"
                  icon={<Mail size={15} />}
                  tone="primary"
                  label="Notes"
                  trailing={
                    props.unreadNoteCount > 0 ? (
                      <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {props.unreadNoteCount}
                      </span>
                    ) : undefined
                  }
                />
                <ListRow href="/kekere/invite" icon={<Gift size={15} />} tone="accent" label="Invite friends, earn cowries" />
              </ListCard>
            </div>
          </section>

          <section id="bank-details" className="scroll-mt-6 px-[22px] pt-6">
            <SectionLabel>Payout account</SectionLabel>
            <BankDetailsSection bankDetails={props.bankDetails} />
          </section>

          <div className="px-[22px] pb-[100px] pt-8">
            <button
              type="button"
              onClick={() => hardSignOut("/kekere")}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(193,58,58,0.22)] bg-transparent py-[14px] text-[14px] font-semibold text-[#A13A3A] transition-colors hover:bg-[rgba(193,58,58,0.06)]"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>

          {shareSheetOpen && (
            <ShareProfileSheet
              writerId={props.userId}
              writerUsername={kekereUsername || null}
              writerName={name}
              onClose={() => setShareSheetOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}