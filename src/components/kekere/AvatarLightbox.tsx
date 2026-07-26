"use client";

import { X } from "lucide-react";

export interface AvatarLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/** Full-bleed enlarged view of a profile picture — tap the avatar to open,
 * tap anywhere (or the X) to close. Matches avatar-crop-modal.tsx's
 * full-screen black-scrim treatment, the only other "look at an image big"
 * moment in the app, rather than inventing a new modal style. */
export function AvatarLightbox({ src, alt, onClose }: AvatarLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Enlarged profile picture"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 text-white/80 transition-colors hover:text-white"
      >
        <X size={26} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
