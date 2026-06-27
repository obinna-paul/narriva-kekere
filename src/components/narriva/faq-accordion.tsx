"use client";

import { useId, useState } from "react";

export interface FAQAccordionItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: readonly FAQAccordionItem[];
  /** Index open on first render — e.g. the Help screen starts each tab with
   * its first question already expanded. Defaults to none open. */
  defaultOpenIndex?: number | null;
}

/** Single-open accordion — opening one question closes any other that's
 * open. The "+" rotates to a "×" (45deg) rather than a chevron flipping,
 * per the design handoff. */
export function FAQAccordion({ items, defaultOpenIndex = null }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);
  const baseId = useId();

  return (
    <div className="border-t border-[var(--color-ink)]/[0.12]">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const triggerId = `${baseId}-trigger-${i}`;

        return (
          <div key={item.question} className="border-b border-[var(--color-ink)]/[0.12]">
            <button
              type="button"
              id={triggerId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-5 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="font-[family-name:var(--font-display)] text-[17px] font-medium text-[var(--color-ink)]">
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className="flex-none text-[22px] text-[var(--color-primary)] transition-transform duration-[250ms]"
                style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}>
              <p className="max-w-[600px] pb-[26px] text-[15px] leading-[1.7] text-[var(--color-muted)]">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
