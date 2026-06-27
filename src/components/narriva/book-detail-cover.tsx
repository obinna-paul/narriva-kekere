import { coverTextColors } from "@/lib/utils/cover-colors";

export interface BookDetailCoverProps {
  title: string;
  author: string;
  coverColor: string;
}

/** The large, sticky cover on the Book Detail page — same flat-cover
 * treatment as BookCard, scaled up for a single-book hero placement. */
export function BookDetailCover({ title, author, coverColor }: BookDetailCoverProps) {
  const { ink, faint } = coverTextColors(coverColor);

  return (
    <div
      role="img"
      aria-label={`${title} cover`}
      className="flex aspect-[3/4] flex-col justify-between border-l-[5px] border-black/20 px-8 py-[38px]"
      style={{
        backgroundColor: coverColor,
        borderRadius: "3px 6px 6px 3px",
        boxShadow: "0 30px 60px -22px rgba(22,22,22,0.5)",
      }}
    >
      <span className="font-[family-name:var(--font-display)] text-sm italic" style={{ color: faint }}>
        Narriva
      </span>
      <div>
        <div className="mb-5 h-px w-8 bg-[var(--color-accent)]" />
        <div
          className="font-[family-name:var(--font-display)] text-[34px] font-medium leading-[1.1]"
          style={{ color: ink }}
        >
          {title}
        </div>
        <div className="mt-[18px] text-xs tracking-[0.06em]" style={{ color: faint }}>
          {author.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
