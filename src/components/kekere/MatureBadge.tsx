import { cn } from "@/lib/utils/cn";

/** Small "18+" corner badge for story covers — the movie/streaming-poster
 * convention of only marking content that needs a warning, so an
 * unrestricted story's cover stays clean. Pair with the age-gate
 * interstitial in story-reader.tsx, which is the actual functional gate;
 * this badge is purely the at-a-glance signal wherever a cover is listed. */
export function MatureBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-[4px] bg-[#A13A3A] px-[5px] py-[2px] text-[9px] font-extrabold tracking-wide text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      18+
    </span>
  );
}
