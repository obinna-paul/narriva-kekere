"use client";

import { useState } from "react";
import { FollowButton } from "@/components/kekere/follow-button";
import { userAvatarUrl } from "@/lib/storage/cloudinary-urls";

export interface WriterFollowHeaderProps {
  writerId: string;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  isOwnProfile: boolean;
  followerAvatars: readonly { id: string; name: string; avatar: string | null; avatarColor: string | null }[];
}

function FollowerAvatarStack({
  avatars,
}: {
  avatars: readonly { id: string; name: string; avatar: string | null; avatarColor: string | null }[];
}) {
  if (avatars.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {avatars.slice(0, 5).map((a) => {
        const initial = a.name.trim().charAt(0).toUpperCase() || "?";
        return (
          <span
            key={a.id}
            className="flex h-6 w-6 flex-none items-center justify-center overflow-hidden rounded-full ring-2 ring-[var(--color-bg)]"
            style={{ background: `linear-gradient(135deg, #E08A4A, ${a.avatarColor ?? "#C75D2C"})` }}
          >
            {a.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatarUrl(a.avatar)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[9px] font-semibold text-white">{initial}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function WriterFollowHeader({
  writerId,
  isLoggedIn,
  initialFollowing,
  initialFollowerCount,
  isOwnProfile,
  followerAvatars,
}: WriterFollowHeaderProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <FollowerAvatarStack avatars={followerAvatars} />
      <span className="text-[13.5px] font-semibold text-[var(--color-ink)]">
        {followerCount} follower{followerCount === 1 ? "" : "s"}
      </span>
      {!isOwnProfile && (
        <FollowButton
          writerId={writerId}
          isLoggedIn={isLoggedIn}
          initialFollowing={initialFollowing}
          variant="full"
          onFollowerCountChange={setFollowerCount}
        />
      )}
    </div>
  );
}
