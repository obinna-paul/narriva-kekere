"use client";

import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";

/**
 * A story's cover at thumbnail size, with the colour block behind it.
 *
 * This exists as its own client component for one reason: the onError
 * handler. A cover that 404s should fall back to the story's colour rather
 * than leave a broken-image glyph sitting in the layout, and hiding it needs
 * a function — which a Server Component cannot pass to a DOM element. React
 * has to serialise every prop it sends across that boundary, and a function
 * has no serialised form, so the whole render throws.
 *
 * It threw here for months without anyone seeing it, because the <img> only
 * renders when a story has a cover at all. Every writer whose stories had no
 * cover got a working page; the first writer with one got a 500. Keeping the
 * handler inside a "use client" file is what makes the fallback legal.
 */
export function StoryCoverThumb({
  coverColor,
  coverImageRef,
}: {
  coverColor: string;
  coverImageRef: string | null;
}) {
  return (
    <div
      className="relative h-[58px] w-[44px] flex-none overflow-hidden rounded-[8px] shadow-[0_2px_8px_rgba(42,26,18,0.15)]"
      style={{ backgroundColor: coverColor }}
    >
      {coverImageRef && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={storyCoverUrl(coverImageRef)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}
