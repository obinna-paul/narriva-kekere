"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { HelpCategory } from "@/content/kekere-help-faqs";

export interface KekereHelpTabsProps {
  categories: readonly HelpCategory[];
}

export function KekereHelpTabs({ categories }: KekereHelpTabsProps) {
  const [tab, setTab] = useState(categories[0].label);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const active = categories.find((c) => c.label === tab) ?? categories[0];

  function switchTab(label: string) {
    setTab(label);
    setOpenIndex(0);
  }

  return (
    <>
      <div className="mx-auto flex max-w-[680px] flex-wrap justify-center gap-2 px-[22px] pb-2">
        {categories.map((category) => (
          <button
            key={category.label}
            type="button"
            onClick={() => switchTab(category.label)}
            className={cn(
              "cursor-pointer rounded-[30px] border px-[15px] py-[9px] text-[13px] font-semibold transition-colors",
              tab === category.label
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)]"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      <section className="mx-auto max-w-[680px] px-[22px] pb-[70px] pt-6">
        <div className="border-t border-[rgba(42,26,18,0.12)]">
          {active.faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div key={faq.question} className="border-b border-[rgba(42,26,18,0.12)]">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 bg-transparent py-5 text-left focus:outline-none"
                  style={{ border: "none", cursor: "pointer" }}
                >
                  <span className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex-none text-xl text-[var(--color-primary)] transition-transform duration-[250ms]"
                    style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    +
                  </span>
                </button>
                {open && (
                  <p className="pb-[22px] text-[14.5px] leading-[1.65] text-[#5A4636]">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-[34px] rounded-2xl border border-[rgba(42,26,18,0.08)] bg-white p-[26px] text-center">
          <p className="text-[15px] text-[var(--color-ink)]">
            Still need us?{" "}
            <span className="font-semibold text-[var(--color-primary)]">Message the team</span>{" "}
            — a real person replies.
          </p>
        </div>
      </section>
    </>
  );
}
