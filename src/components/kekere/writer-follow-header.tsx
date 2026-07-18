"use client";

import { useState } from "react";
import { FollowButton } from "@/components/kekere/follow-button";

export interface WriterFollowHeaderProps {
  writerId: string;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  isOwnProfile: boolean;
}

export function WriterFollowHeader({
  writerId,
  isLoggedIn,
  initialFollowing,
  initialFollowerCount,
  isOwnProfile,
}: WriterFollowHeaderProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
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
