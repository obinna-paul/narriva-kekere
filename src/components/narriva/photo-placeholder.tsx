import { cn } from "@/lib/utils/cn";

export interface PhotoPlaceholderProps {
  label: string;
  aspect: "4/5" | "16/10" | "4/3" | "16/9" | "1/1";
  className?: string;
}

const ASPECT_CLASS: Record<PhotoPlaceholderProps["aspect"], string> = {
  "4/5": "aspect-[4/5]",
  "16/10": "aspect-[16/10]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
  "1/1": "aspect-square",
};

/** Diagonal-striped placeholder standing in for real photography (author
 * portraits, editorial images) — per the design handoff: "Replace with
 * warm, natural photography (set, not random stock)." Until that asset
 * pipeline exists, this is the explicit, labeled placeholder rather than a
 * silently-wrong stock image or solid colour block. */
export function PhotoPlaceholder({ label, aspect, className }: PhotoPlaceholderProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-[3px]", ASPECT_CLASS[aspect], className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, #ECE7DD, #ECE7DD 9px, #E6E0D4 9px, #E6E0D4 18px)",
      }}
    >
      <span className="absolute bottom-2.5 left-3 font-mono text-[10px] tracking-wide text-[#A99F8E]">
        {label}
      </span>
    </div>
  );
}
