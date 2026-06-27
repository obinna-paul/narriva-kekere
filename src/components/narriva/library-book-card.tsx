import Link from "next/link";
import { coverTextColors } from "@/lib/utils/cover-colors";

export interface LibraryBookCardProps {
  bookId: string;
  title: string;
  author: string;
  coverColor: string;
  progressPct: number;
  status: string;
  statusColor: "primary" | "success" | "muted";
  cta: string;
}

const STATUS_COLOR_VAR: Record<LibraryBookCardProps["statusColor"], string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  muted: "var(--color-muted-3)",
};

/** Smaller flat-cover treatment than BookCard — adds the reading-progress
 * bar under the cover and a status line (in progress / finished / not
 * started), since this is "what you own and where you left off," not a
 * sales card. */
export function LibraryBookCard({
  bookId,
  title,
  author,
  coverColor,
  progressPct,
  status,
  statusColor,
  cta,
}: LibraryBookCardProps) {
  const { ink, faint } = coverTextColors(coverColor);

  return (
    <div>
      <Link href={`/read/${bookId}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
        <div
          className="flex aspect-[3/4] flex-col justify-between border-l-4 border-black/[0.16] px-5 py-6 transition-transform duration-300 hover:-translate-y-[5px]"
          style={{
            backgroundColor: coverColor,
            borderRadius: "3px 5px 5px 3px",
            boxShadow: "0 12px 28px -14px rgba(22,22,22,0.34)",
          }}
        >
          <span className="font-[family-name:var(--font-display)] text-[11px] italic" style={{ color: faint }}>
            Narriva
          </span>
          <div>
            <div className="mb-3 h-px w-[22px] bg-[var(--color-accent)]" />
            <div
              className="font-[family-name:var(--font-display)] text-lg font-medium leading-[1.14]"
              style={{ color: ink }}
            >
              {title}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--color-ink)]/10">
          <div
            className="h-full bg-[var(--color-primary)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Link>

      <div className="mt-3 font-[family-name:var(--font-display)] text-base font-medium leading-tight text-[var(--color-ink)]">
        {title}
      </div>
      <div className="mt-[3px] text-[12.5px] text-[var(--color-muted-3)]">{author}</div>
      <div className="mt-2 text-[12.5px]" style={{ color: STATUS_COLOR_VAR[statusColor] }}>
        {status}
      </div>
      <Link
        href={`/read/${bookId}`}
        className="mt-3 inline-block border-b border-[var(--color-primary)]/30 text-[13px] font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
      >
        {cta} →
      </Link>
    </div>
  );
}
