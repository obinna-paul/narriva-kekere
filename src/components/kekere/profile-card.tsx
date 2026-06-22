import type { MockProfile } from "@/content/mock/kekere-profile";

export interface ProfileCardProps {
  profile: MockProfile;
  onEditClick?: () => void;
}

export function ProfileCard({ profile, onEditClick }: ProfileCardProps) {
  return (
    <div className="rounded-3xl bg-[var(--color-ink)]/[0.04] p-6 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
        style={{ backgroundColor: profile.avatarColor }}
      >
        {profile.name
          .split(" ")
          .map((p) => p[0])
          .join("")}
      </span>
      <h1 className="mt-3 text-xl font-bold">{profile.name}</h1>
      <p className="text-sm text-[var(--color-ink)]/50">{profile.email}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--color-ink)]/75">{profile.bio}</p>
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="mt-4 rounded-full border border-[var(--color-ink)]/15 px-5 py-2 text-sm font-medium"
        >
          Edit profile
        </button>
      )}
    </div>
  );
}
