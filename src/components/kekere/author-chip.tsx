import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface AuthorChipProps {
  authorId: string;
  authorName: string;
  avatarColor?: string | null;
  /** Already a full CDN URL (or null), precomputed server-side — see
   * toFeedStoryData in lib/adapters/kekere.ts. AuthorChip renders inside
   * client components, so it must never call into lib/storage/cloudinary.ts
   * itself: that module imports the Cloudinary SDK, which needs Node's
   * `fs` and breaks the browser bundle. */
  avatarUrl?: string | null;
  /** "sm" for dense list rows (search results, library, competition
   * winners); "md" for a standalone byline (story reader, completion
   * screen). Both are the same avatar-plus-name pattern — this is the one
   * visual signal the whole app uses for "this is a person, tap them." */
  size?: "sm" | "md";
  /** False inside a row that's already a Link to the story itself (nesting
   * an <a> inside an <a> is invalid HTML) — renders the identical
   * avatar-plus-name visual as a plain span instead, so the affordance
   * still reads consistently even where it isn't its own tap target. */
  linked?: boolean;
  className?: string;
}

export function AuthorChip({
  authorId,
  authorName,
  avatarColor,
  avatarUrl,
  size = "sm",
  linked = true,
  className,
}: AuthorChipProps) {
  const initial = authorName.trim().charAt(0).toUpperCase() || "?";
  const color = avatarColor ?? "#C75D2C";
  const dim = size === "sm" ? 18 : 22;

  const content = (
    <>
      <span
        className="flex flex-none items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] font-semibold text-white"
        style={{
          width: dim,
          height: dim,
          fontSize: dim * 0.5,
          background: `linear-gradient(135deg, #E08A4A, ${color})`,
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className={cn("font-semibold text-[var(--color-ink)]", linked && "transition-colors group-hover:text-[var(--color-primary)]")}>
        {authorName}
      </span>
    </>
  );

  if (!linked) {
    return <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>{content}</span>;
  }

  return (
    <Link
      href={`/kekere/writer/${authorId}`}
      className={cn("group inline-flex items-center gap-1.5 align-middle", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  );
}
