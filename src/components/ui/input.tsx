import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Validation/error message — also wires aria-invalid + aria-describedby. */
  error?: string;
  hint?: string;
}

// forwardRef is required for React Hook Form's register() to attach.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, error, hint, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = error || hint ? `${inputId}-message` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={messageId}
          className={cn(
            "h-11 w-full rounded-md border border-[var(--color-ink)]/20 bg-[var(--color-bg)] px-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input";
