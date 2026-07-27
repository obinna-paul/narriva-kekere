"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 60000;

interface PulseValue {
  unreadNotifications: number;
  pendingKemiNudges: number;
  /** Optimistic local adjustment — the bell decrements as the reader works
   *  through the drawer, without waiting for the next poll to agree. */
  adjustUnreadNotifications: (delta: number) => void;
  setUnreadNotifications: (value: number) => void;
  setPendingKemiNudges: (value: number) => void;
  /** Force a poll now — after an action that certainly changed a count. */
  refresh: () => void;
}

const PulseContext = createContext<PulseValue>({
  unreadNotifications: 0,
  pendingKemiNudges: 0,
  adjustUnreadNotifications: () => {},
  setUnreadNotifications: () => {},
  setPendingKemiNudges: () => {},
  refresh: () => {},
});

export function useKekerePulse(): PulseValue {
  return useContext(PulseContext);
}

/**
 * One poll for the whole app's chrome.
 *
 * The notification bell and Kemi's unread dot each ran their own 60-second
 * interval, so an idle reader cost two requests a minute — two session
 * decodes, two round trips — purely to sit there. They're the same shape of
 * question, so they're now the same request, answered once and shared.
 *
 * It also stops entirely while the tab is hidden. Most open tabs are
 * backgrounded, and a background tab was polling exactly as hard as the one
 * being looked at; nobody can see a badge they aren't looking at. Coming
 * back to the tab refreshes immediately, so the pause costs nothing
 * perceptible.
 */
export function KekerePulseProvider({ children }: { children: React.ReactNode }) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingKemiNudges, setPendingKemiNudges] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/kekere/pulse");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadNotifications(data.unreadNotifications ?? 0);
      setPendingKemiNudges(data.pendingKemiNudges ?? 0);
    } catch {
      // Best-effort. A stale badge until the next tick is a fine failure.
    }
  }, []);

  useEffect(() => {
    function start() {
      if (timerRef.current) return;
      timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }
    function stop() {
      if (!timerRef.current) return;
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        // Refresh before resuming: the counts may have moved while away, and
        // waiting a further 60s to find out would be the visible cost of the
        // pause.
        poll();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") {
      poll();
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", poll);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", poll);
    };
  }, [poll]);

  const adjustUnreadNotifications = useCallback((delta: number) => {
    setUnreadNotifications((prev) => Math.max(0, prev + delta));
  }, []);

  return (
    <PulseContext.Provider
      value={{
        unreadNotifications,
        pendingKemiNudges,
        adjustUnreadNotifications,
        setUnreadNotifications,
        setPendingKemiNudges,
        refresh: poll,
      }}
    >
      {children}
    </PulseContext.Provider>
  );
}
