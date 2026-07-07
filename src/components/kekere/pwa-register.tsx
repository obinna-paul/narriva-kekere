"use client";

import { useEffect } from "react";

/**
 * Registers Kekere's service worker, scoped explicitly to "/kekere/" —
 * matches where the file itself is served from (public/kekere/sw.js), so
 * the browser's own scope enforcement makes it impossible for this to ever
 * control a Narriva page. Renders once from src/app/(kekere)/layout.tsx;
 * never rendered on any Narriva or admin route.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/kekere/sw.js", { scope: "/kekere/" })
      .catch((err) => {
        // Registration failures (unsupported browser quirks, dev-mode HTTP,
        // etc.) shouldn't be user-visible — the app works fine without it.
        console.warn("Kekere service worker registration failed:", err);
      });
  }, []);

  return null;
}
