import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils/cn";

// A sliding panel (left-edge sidebar, bottom sheet) built on Radix Dialog —
// same focus-trap/ESC/overlay/scroll-lock guarantees as Dialog, just docked
// to an edge and sliding in instead of appearing centered. Brand-neutral via
// CSS variables, like every other src/components/ui primitive.

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-40 bg-[var(--color-ink)]/30 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "left" | "right" | "bottom";
}

const SIDE_CLASSES: Record<NonNullable<SheetContentProps["side"]>, string> = {
  left: "inset-y-0 left-0 h-full w-[300px] max-w-[84vw] data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 [box-shadow:18px_0_50px_-20px_rgba(42,26,18,0.4)]",
  right: "inset-y-0 right-0 h-full w-[360px] max-w-[88vw] data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 [box-shadow:-18px_0_50px_-20px_rgba(42,26,18,0.4)]",
  bottom:
    "inset-x-0 bottom-0 max-h-[88vh] rounded-t-[20px] data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
};

export const SheetContent = forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, side = "left", children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-40 overflow-y-auto bg-[var(--color-bg)] p-6 text-[var(--color-ink)] transition-transform duration-300 focus:outline-none",
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = "SheetContent";
