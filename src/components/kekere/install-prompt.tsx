"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

// sessionStorage, not localStorage: a decline/dismiss should only quiet the
// banner for the current browser session, not forever — so it resurfaces on
// the next visit (and, notably, after an uninstall + revisit, since that's
// a fresh session) instead of being silenced permanently on this origin.
const DISMISSED_KEY = "kekere-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag for "launched from home screen"
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  // Chrome/Firefox on iOS report Safari's engine but can't install PWAs the
  // same way — exclude them so the instructions aren't shown to someone who
  // can't actually follow them.
  const isOtherBrowser = /crios|fxios|edgios/.test(ua);
  return isIos && !isOtherBrowser;
}

/**
 * In-flow banner (not `fixed`) so it never collides with the fixed
 * BottomNav — it just occupies normal space at the top of the page and
 * pushes content down while visible. Rendered once from
 * src/app/(kekere)/layout.tsx.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checks run

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY) === "1") return;

    setDismissed(false);

    if (isIosSafari()) {
      setShowIosHint(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    // Only silence the banner outright on an accepted install (the app is
    // about to become standalone, so isStandalone() takes over from here).
    // On a decline, just clear the consumed prompt — don't call dismiss(),
    // so the banner can still reappear this session if the browser fires
    // beforeinstallprompt again, and definitely reappears next session.
    if (outcome === "accepted") setDismissed(true);
  }

  if (dismissed) return null;
  if (!deferredPrompt && !showIosHint) return null;

  return (
    <div className="flex items-center gap-3 bg-[var(--color-primary)] px-4 py-2.5 text-white">
      {showIosHint ? (
        <>
          <Share2 size={16} className="flex-none" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-[1.3]">
            Install Kekere: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
        </>
      ) : (
        <>
          <Download size={16} className="flex-none" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-[1.3]">Add Kekere to your home screen for quick access.</p>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-none rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[var(--color-primary)]"
          >
            Install
          </button>
        </>
      )}
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex-none text-white/80">
        <X size={15} />
      </button>
    </div>
  );
}
