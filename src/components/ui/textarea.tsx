import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, id, error, hint, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const messageId = error || hint ? `${textareaId}-message` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error || undefined}
          aria-describedby={messageId}
          className={cn(
            "w-full resize-y rounded-md border border-[var(--color-ink)]/20 bg-[var(--color-bg)] px-3 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <p
            id={messageId}
            className={cn("text-sm", error ? "text-red-600" : "text-[var(--color-ink)]/60")}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
