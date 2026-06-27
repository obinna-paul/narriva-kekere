"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { FAQAccordion } from "@/components/narriva/faq-accordion";
import type { HelpCategory } from "@/content/narriva-help-faqs";

export interface HelpTabsProps {
  categories: readonly HelpCategory[];
}

export function HelpTabs({ categories }: HelpTabsProps) {
  const [activeLabel, setActiveLabel] = useState(categories[0].label);
  const active = categories.find((c) => c.label === activeLabel) ?? categories[0];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {categories.map((category) => {
          const isActive = category.label === activeLabel;
          return (
            <button
              key={category.label}
              type="button"
              onClick={() => setActiveLabel(category.label)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium",
                isActive
                  ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "border border-[var(--color-ink)]/[0.16] bg-transparent text-[var(--color-muted)]"
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-10">
        {/* Remounts on tab change so each category starts with its first
            question already open, per the design. */}
        <FAQAccordion key={active.label} items={active.faqs} defaultOpenIndex={0} />
      </div>
    </div>
  );
}
