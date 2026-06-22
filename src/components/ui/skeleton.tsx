import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Brand-neutral pulsing placeholder block for loading.tsx states. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-[var(--color-ink)]/10", className)}
      {...props}
    />
  );
}
