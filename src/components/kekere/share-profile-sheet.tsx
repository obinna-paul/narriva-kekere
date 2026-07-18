"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ShareProfileSheetProps {
  writerId: string;
  writerName: string;
  onClose: () => void;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "writer";
}

export function ShareProfileSheet({ writerId, writerName, onClose }: ShareProfileSheetProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const profileUrl = `${window.location.origin}/kekere/writer/${writerId}`;
  const cardUrl = `/api/kekere/writers/${writerId}/card`;

  function handleCopyLink() {
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("Failed to generate card");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(writerName)}-kekere-profile-card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Couldn't generate your card — try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[24px] bg-[var(--color-bg)] shadow-[0_-20px_60px_-10px_rgba(42,26,18,0.5)]">
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-[3px] w-10 rounded-full bg-[rgba(42,26,18,0.18)]" />
        </div>

        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
            Share your profile
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-[calc(28px+env(safe-area-inset-bottom))]">
          {/* Live card preview */}
          <div
            className="mx-auto mb-5 overflow-hidden rounded-[16px] bg-[#150D08]"
            style={{ width: "100%", maxWidth: 300, aspectRatio: "1080/1350" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt="Your Kekere profile card"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-[14px] border px-4 py-[15px] text-[14.5px] font-semibold transition-colors",
                copied
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)]/40"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Link copied" : "Copy profile link"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 py-[15px] text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Download size={16} />
              {downloading ? "Generating your card…" : "Download profile card"}
            </button>
            {downloadError && <p className="text-center text-[12.5px] text-[#A13A3A]">{downloadError}</p>}
          </div>

          <p className="mt-4 text-center text-[12px] leading-[1.5] text-[var(--color-ink-muted-3)]">
            Share it on Instagram, X, or WhatsApp so readers can find you on Kekere.
          </p>
        </div>
      </div>
    </>
  );
}
