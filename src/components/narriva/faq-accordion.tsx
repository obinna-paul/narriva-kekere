"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Body } from "@/components/ui/typography";
import { cn } from "@/lib/utils/cn";

export interface FAQAccordionItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: readonly FAQAccordionItem[];
}

/** Single-open accordion — opening one question closes any other that's open. */
export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="flex flex-col divide-y divide-[var(--color-ink)]/10 border-y border-[var(--color-ink)]/10">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const triggerId = `${baseId}-trigger-${i}`;

        return (
          <div key={item.question}>
            <button
              type="button"
              id={triggerId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="font-medium">{item.question}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 shrink-0 text-[var(--color-ink)]/60 transition-transform",
                  open && "rotate-180"
                )}
              />
            </button>
            <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}>
              <Body size="base" className="pb-5 text-[var(--color-ink)]/75">
                {item.answer}
              </Body>
            </div>
          </div>
        );
      })}
    </div>
  );
}
