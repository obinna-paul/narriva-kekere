"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ShareProfileSheetProps {
  writerId: string;
  writerUsername?: string | null;
  writerName: string;
  onClose: () => void;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "writer";
}

export function ShareProfileSheet({ writerId, writerUsername, writerName, onClose }: ShareProfileSheetProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // A fresh cache-buster per mount (i.e. every time this sheet is opened —
  // it's conditionally rendered in profile-view.tsx, so each open is a real
  // mount) makes the URL itself unique. Belt-and-suspenders alongside the
  // route's own Cache-Control: no-store — this way a stale card can't
  // survive even if some layer between here and the server (a proxy, an
  // over-eager browser image cache) doesn't fully honor those headers.
  const [cacheBuster] = useState(() => Date.now());
  const profileUrl = `${window.location.origin}/kekere/writer/${writerUsername || writerId}`;
  const cardUrl = `/api/kekere/writers/${writerId}/card?v=${cacheBuster}`;

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
      const res = await fetch(cardUrl, { cache: "no-store" });
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
            className="relative mx-auto mb-5 overflow-hidden rounded-[16px] bg-[#150D08]"
            style={{ width: "100%", maxWidth: 300, aspectRatio: "1080/1350" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardUrl}
              alt="Your Kekere profile card"
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                cardLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setCardLoaded(true)}
              onError={() => setCardFailed(true)}
            />

            {/* Card generation is a server-rendered image (fonts + a DB
             *  lookup), so it's rarely instant — without this, a first-time
             *  visitor sees a plain dark rectangle and has no way to know
             *  anything is happening. */}
            {!cardLoaded && !cardFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="font-[family-name:var(--font-display)] text-[14.5px] font-medium text-white/90">
                  Designing your profile card…
                </span>
                <div className="h-[3px] w-full max-w-[140px] overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-1/3 rounded-full bg-[var(--color-primary)]" style={{ animation: "spcLoadBar 1.1s ease-in-out infinite" }} />
                </div>
              </div>
            )}
            {cardFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-8 text-center">
                <span className="text-[13px] font-medium text-white/80">Couldn&rsquo;t load your card preview</span>
                <span className="text-[12px] text-white/50">You can still try downloading it below.</span>
              </div>
            )}
            <style>{`
              @keyframes spcLoadBar {
                0% { transform: translateX(-110%); }
                100% { transform: translateX(310%); }
              }
            `}</style>
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
