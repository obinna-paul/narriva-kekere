"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FollowButtonProps {
  writerId: string;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  /** "compact" for inline placement next to a byline; "full" for the
   * writer profile's primary CTA. */
  variant?: "compact" | "full";
  onFollowerCountChange?: (count: number) => void;
  className?: string;
}

export function FollowButton({
  writerId,
  isLoggedIn,
  initialFollowing,
  variant = "compact",
  onFollowerCountChange,
  className,
}: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);

    // Optimistic — a follow/unfollow toggle should feel instant.
    const next = !following;
    setFollowing(next);

    try {
      const res = await fetch(`/api/kekere/writers/${writerId}/follow`, { method: next ? "POST" : "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFollowing(!next);
      } else if (typeof data?.followerCount === "number") {
        onFollowerCountChange?.(data.followerCount);
      }
    } catch {
      setFollowing(!next);
    }
    setBusy(false);
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-full px-6 py-[10px] text-sm font-semibold transition-colors disabled:opacity-60",
          following
            ? "border border-[rgba(42,26,18,0.16)] bg-transparent text-[var(--color-ink)] hover:border-[#A13A3A] hover:text-[#A13A3A]"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]",
          className,
        )}
      >
        {following ? <Check size={15} /> : <UserPlus size={15} />}
        {following ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors disabled:opacity-60",
        following
          ? "bg-[rgba(42,26,18,0.06)] text-[var(--color-ink-muted-2)]"
          : "bg-[var(--color-primary-muted)] text-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white",
        className,
      )}
    >
      {following ? <Check size={11} /> : <UserPlus size={11} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
