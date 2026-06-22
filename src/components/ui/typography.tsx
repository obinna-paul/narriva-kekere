import { forwardRef } from "react";
import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

// Brand-neutral: font comes from --font-display / --font-body, set by a theme
// wrapper (NarrivaTheme / KekereTheme). Never import Fraunces or Inter here.
function fontVar(font: "display" | "body") {
  return font === "display" ? "font-[family-name:var(--font-display)]" : "font-[family-name:var(--font-body)]";
}

const headingVariants = cva("text-[var(--color-ink)]", {
  variants: {
    size: {
      h1: "text-4xl leading-tight tracking-tight md:text-5xl",
      h2: "text-3xl leading-tight tracking-tight md:text-4xl",
      h3: "text-2xl leading-snug md:text-3xl",
      h4: "text-xl leading-snug md:text-2xl",
    },
  },
  defaultVariants: { size: "h2" },
});

type HeadingTag = "h1" | "h2" | "h3" | "h4";

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Which heading element to render — semantic level, for document outline / a11y. */
  as?: HeadingTag;
  font?: "display" | "body";
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as, size, font = "display", className, ...props }, ref) => {
    const Tag: HeadingTag = as ?? (size as HeadingTag) ?? "h2";
    const visualSize = size ?? as ?? "h2";
    return (
      <Tag
        ref={ref}
        className={cn(headingVariants({ size: visualSize }), fontVar(font), className)}
        {...props}
      />
    );
  }
);
Heading.displayName = "Heading";

const bodyVariants = cva("text-[var(--color-ink)]", {
  variants: {
    size: {
      lg: "text-lg leading-relaxed",
      base: "text-base leading-relaxed",
      sm: "text-sm leading-normal",
    },
  },
  defaultVariants: { size: "base" },
});

type BodyTag = "p" | "span" | "div";

export interface BodyProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof bodyVariants> {
  as?: BodyTag;
  font?: "display" | "body";
}

export const Body = forwardRef<HTMLParagraphElement, BodyProps>(
  ({ as = "p", size, font = "body", className, ...props }, ref) => {
    const Tag = as;
    return (
      <Tag
        ref={ref as never}
        className={cn(bodyVariants({ size }), fontVar(font), className)}
        {...props}
      />
    );
  }
);
Body.displayName = "Body";

export interface LabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "htmlFor"> {
  font?: "display" | "body";
  /** Use the default "label" when associating with a form control via `htmlFor`;
   * use "span" for eyebrow/kicker text that isn't tied to any control. */
  as?: "label" | "span";
  htmlFor?: string;
}

/**
 * Small uppercase-tracked label text. Doubles as a form field label — pass
 * `htmlFor` to associate it with an Input/Textarea/Select/Checkbox id — or as
 * standalone eyebrow/kicker text via `as="span"`.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, font = "body", as = "label", ...props }, ref) => {
    const Tag = as;
    return (
      <Tag
        ref={ref as never}
        className={cn(
          "text-sm font-medium tracking-wide text-[var(--color-ink)]",
          fontVar(font),
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
