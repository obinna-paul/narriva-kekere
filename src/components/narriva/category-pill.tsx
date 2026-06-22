import { cn } from "@/lib/utils/cn";

interface CategoryPillBaseProps {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

export type CategoryPillProps =
  | (CategoryPillBaseProps & { as?: "span" })
  | (CategoryPillBaseProps &
      Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
        as: "button";
      });

const baseClasses =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors";

/**
 * Display-only tag (`as="span"`, the default) for a category label on a
 * BlogCard or post detail page, or an interactive filter pill (`as="button"`)
 * on the blog listing.
 */
export function CategoryPill({ as = "span", active, className, children, ...props }: CategoryPillProps) {
  const colorClasses = active
    ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
    : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]";

  if (as === "button") {
    return (
      <button
        type="button"
        className={cn(
          baseClasses,
          colorClasses,
          "cursor-pointer hover:bg-[var(--color-primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
          active && "hover:bg-[var(--color-primary-light)]",
          className
        )}
        aria-pressed={active}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return <span className={cn(baseClasses, colorClasses, className)}>{children}</span>;
}
