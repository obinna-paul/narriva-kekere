"use client";

export interface BookDetailGalleryProps {
  title: string;
  coverColor: string;
}

export function BookDetailGallery({ title, coverColor }: BookDetailGalleryProps) {
  return (
    <div
      role="img"
      aria-label={`${title} cover`}
      className="flex aspect-[3/4] w-full max-w-sm items-center justify-center rounded-lg p-8 text-center shadow-sm"
      style={{ backgroundColor: coverColor }}
    >
      <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
        {title}
      </span>
    </div>
  );
}
