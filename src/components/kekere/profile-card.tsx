import type { MockProfile } from "@/content/mock/kekere-profile";

export interface ProfileCardProps {
  profile: MockProfile;
  onEditClick?: () => void;
}

export function ProfileCard({ profile, onEditClick }: ProfileCardProps) {
  return (
    <div className="animate-fade-in-up rounded-3xl bg-[var(--color-surface)] p-6 text-center shadow-sm shadow-black/5 ring-1 ring-[var(--color-border)]">
      <span
        aria-hidden="true"
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
        style={{ backgroundColor: profile.avatarColor }}
      >
        {profile.name
          .split(" ")
          .map((p) => p[0])
          .join("")}
      </span>
      <h1 className="mt-3 text-xl font-bold">{profile.name}</h1>
      <p className="text-sm text-[var(--color-ink-muted)]">{profile.email}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--color-ink)]/75">{profile.bio}</p>
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="mt-4 rounded-full border border-[var(--color-border)] px-5 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-primary)]"
        >
          Edit profile
        </button>
      )}
    </div>
  );
}
