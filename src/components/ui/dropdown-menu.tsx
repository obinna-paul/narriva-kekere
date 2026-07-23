import { forwardRef } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn";

// Radix DropdownMenu already handles focus management, outside-click/Esc
// dismissal, and aria roving-tabindex wiring. Styling here is brand-neutral
// via CSS variables, matching the Dialog/Sheet wrappers in this folder.

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, align = "end", ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 min-w-[228px] rounded-[14px] border border-[rgba(42,26,18,.10)] bg-white p-1.5 text-[var(--color-ink)] shadow-[0_12px_32px_rgba(42,26,18,.16)] focus:outline-none data-[state=closed]:animate-none data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[#2A1A12] outline-none transition-colors data-[highlighted]:bg-[rgba(42,26,18,.05)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("my-1.5 h-px bg-[rgba(42,26,18,.08)]", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
