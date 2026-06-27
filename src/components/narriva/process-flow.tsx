export interface ProcessStep {
  title: string;
  description: string;
}

export interface ProcessFlowProps {
  steps: readonly ProcessStep[];
}

/**
 * Numbered step flow with a connecting line — horizontal on md+, a vertical
 * stepper on mobile. Both layouts render; Tailwind's display toggle keeps
 * only one visible (and the other is `display:none`, so it's invisible to
 * assistive tech too — no duplicate announcements).
 */
export function ProcessFlow({ steps }: ProcessFlowProps) {
  return (
    <>
      {/* Mobile: vertical stepper */}
      <ol className="flex flex-col gap-8 md:hidden">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 pl-1">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-5 top-10 h-[calc(100%+1rem)] w-px bg-[var(--color-primary)]/20"
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--color-primary)] bg-[var(--color-bg)] font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-primary)]"
            >
              {i + 1}
            </span>
            <div className="pt-1">
              <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[var(--color-muted-2)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal flow */}
      <ol className="relative hidden grid-cols-6 gap-[18px] md:grid">
        <span
          aria-hidden="true"
          className="absolute left-[8%] right-[8%] top-5 h-px bg-[var(--color-primary)]/20"
        />
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex flex-col items-center text-center">
            <span
              aria-hidden="true"
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-[var(--color-primary)] bg-[var(--color-bg)] font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-primary)]"
            >
              {i + 1}
            </span>
            <h3 className="mt-[22px] text-[15px] font-semibold text-[var(--color-ink)]">
              {step.title}
            </h3>
            <p className="mt-2 px-1.5 text-[13px] leading-[1.55] text-[var(--color-muted-2)]">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
