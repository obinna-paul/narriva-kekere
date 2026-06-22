"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface ExcerptReaderProps {
  paragraphs: readonly string[];
}

/** Inline expandable "read the first chapter" reader — no PDF, no separate page. */
export function ExcerptReader({ paragraphs }: ExcerptReaderProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(buttonVariants({ variant: "secondary", size: "md" }), "gap-2")}
      >
        {open ? "Hide excerpt" : "Read the first chapter"}
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        id={contentId}
        hidden={!open}
        className="mt-6 flex max-w-2xl flex-col gap-4 border-l-2 border-[var(--color-ink)]/10 pl-6"
      >
        {paragraphs.map((paragraph, i) => (
          <Body key={i} size="base" font="display" className="whitespace-pre-line leading-relaxed">
            {paragraph}
          </Body>
        ))}
      </div>
    </div>
  );
}
