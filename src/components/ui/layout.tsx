import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const containerVariants = cva("mx-auto w-full px-4 sm:px-6 lg:px-8", {
  variants: {
    size: {
      sm: "max-w-2xl",
      md: "max-w-4xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-none",
    },
  },
  defaultVariants: { size: "xl" },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, ...props }, ref) => (
    <div ref={ref} className={cn(containerVariants({ size }), className)} {...props} />
  )
);
Container.displayName = "Container";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** Adds vertical rhythm between page sections. */
  spacing?: "sm" | "md" | "lg";
}

const sectionSpacing: Record<NonNullable<SectionProps["spacing"]>, string> = {
  sm: "py-8 md:py-12",
  md: "py-12 md:py-20",
  lg: "py-20 md:py-28",
};

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = "md", ...props }, ref) => (
    <section ref={ref} className={cn(sectionSpacing[spacing], className)} {...props} />
  )
);
Section.displayName = "Section";

// Literal class strings (not built dynamically) so Tailwind's static scan
// picks them up — see Grid below.
const gridColsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
} as const;

const gridGapMap = {
  sm: "gap-3",
  md: "gap-6",
  lg: "gap-8",
} as const;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: keyof typeof gridColsMap;
  gap?: keyof typeof gridGapMap;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 3, gap = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid", gridColsMap[cols], gridGapMap[gap], className)}
      {...props}
    />
  )
);
Grid.displayName = "Grid";
