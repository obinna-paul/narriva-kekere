import { cn } from "@/lib/utils/cn";

/** Marks a published story that's a live competition entry — accepted, in the
 *  running, not yet judged. Deliberately unlike MatureBadge's red warning
 *  chip: this is an honour, so it reads as a ribbon rather than a caution.
 *
 *  Driven by Story.longlisted, which is cleared for every entry the moment
 *  its competition goes COMPLETE — winners move to the Winner's Circle and
 *  everyone else goes back to being an ordinary story, so this badge never
 *  outlives the prize it refers to. */
export function LonglistBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-[4px] bg-[#5A3D8A] px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-wide text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      Longlist
    </span>
  );
}
