import { BuyBookButton, type BuyBookButtonProps } from "@/components/narriva/buy-book-button";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export interface BookExcerptSectionProps {
  paragraphs: readonly string[];
  priceNgn: number;
  buyButtonProps: Omit<BuyBookButtonProps, "label" | "className">;
}

/** Always-visible first-chapter excerpt that fades out and ends in a buy
 * CTA — no expand/collapse toggle. Matches the design's intent: a real taste
 * of the prose, then a clear reason to buy, not a gate to click past. */
export function BookExcerptSection({ paragraphs, priceNgn, buyButtonProps }: BookExcerptSectionProps) {
  return (
    <section id="chapter" className="border-t border-[var(--color-ink)]/[0.07] bg-[var(--color-bg-alt)]">
      <div className="mx-auto max-w-[680px] px-8 pt-[72px]">
        <div className="mb-12 text-center">
          <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
            Read the first chapter
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium text-[var(--color-ink)]">
            Chapter One
          </h2>
        </div>

        <div className="relative">
          <div className="font-[family-name:var(--font-display)] text-[19px] leading-[1.8] text-[#2A2620]">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-6 whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[240px]"
            style={{ background: "linear-gradient(to bottom, rgba(246,243,237,0), var(--color-bg-alt))" }}
          />
        </div>

        <div className="px-0 py-2 pb-20 text-center">
          <p className="mb-6 font-[family-name:var(--font-display)] text-lg italic text-[var(--color-muted)]">
            The first chapter ends here.
          </p>
          <BuyBookButton
            {...buyButtonProps}
            label={`Buy to continue reading — ${priceFormatter.format(priceNgn)}`}
            className="inline-flex w-auto px-8 text-base font-semibold"
          />
        </div>
      </div>
    </section>
  );
}
