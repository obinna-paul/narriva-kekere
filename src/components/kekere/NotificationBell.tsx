"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const POLL_INTERVAL_MS = 60000;

type NotificationType =
  | "STORY_SUBMITTED"
  | "STORY_APPROVED"
  | "STORY_REVISIONS_REQUESTED"
  | "STORY_REJECTED"
  | "CONTRACT_RECEIVED"
  | "COMPETITION_RESULT"
  | "REFERRAL_REWARD_EARNED"
  | "REFERRAL_JOINED"
  | "WITHDRAWAL_PROCESSED"
  | "WITHDRAWAL_REJECTED"
  | "VERSION_RESTORED"
  | "STREAK_MILESTONE_REACHED"
  | "NEW_FOLLOWER"
  | "WRITER_PUBLISHED"
  | "NOTE_RECEIVED"
  | "NOTE_REPLIED"
  | "STREAK_AT_RISK"
  | "EDITS_PROPOSED";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// Glyph characters in tinted circles — matches the design spec exactly
const TYPE_CONFIG: Record<NotificationType, { glyph: string; bg: string; fg: string }> = {
  STORY_APPROVED:            { glyph: "✓", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  STORY_REVISIONS_REQUESTED: { glyph: "✎", bg: "rgba(199,122,30,.16)", fg: "#A8690F" },
  STORY_REJECTED:            { glyph: "✕", bg: "rgba(42,26,18,.08)",    fg: "rgba(42,26,18,.5)" },
  STORY_SUBMITTED:           { glyph: "↗", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  CONTRACT_RECEIVED:         { glyph: "✶", bg: "rgba(154,106,63,.16)",  fg: "#7A4A2E" },
  COMPETITION_RESULT:        { glyph: "★", bg: "rgba(199,93,44,.14)",   fg: "#C75D2C" },
  REFERRAL_REWARD_EARNED:    { glyph: "◆", bg: "rgba(199,93,44,.14)",   fg: "#C75D2C" },
  REFERRAL_JOINED:           { glyph: "◇", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  WITHDRAWAL_PROCESSED:      { glyph: "₦", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  WITHDRAWAL_REJECTED:       { glyph: "✕", bg: "rgba(42,26,18,.08)",    fg: "rgba(42,26,18,.5)" },
  VERSION_RESTORED:          { glyph: "⟲", bg: "rgba(154,106,63,.16)",  fg: "#7A4A2E" },
  STREAK_MILESTONE_REACHED:  { glyph: "🔥", bg: "rgba(199,93,44,.14)",   fg: "#C75D2C" },
  NEW_FOLLOWER:              { glyph: "★", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  WRITER_PUBLISHED:          { glyph: "✎", bg: "rgba(199,93,44,.14)",   fg: "#C75D2C" },
  NOTE_RECEIVED:             { glyph: "✉", bg: "rgba(154,106,63,.16)",  fg: "#7A4A2E" },
  NOTE_REPLIED:              { glyph: "↩", bg: "rgba(31,75,75,.12)",    fg: "#1F4B4B" },
  STREAK_AT_RISK:            { glyph: "⚡", bg: "rgba(199,93,44,.14)",   fg: "#C75D2C" },
  EDITS_PROPOSED:            { glyph: "✎", bg: "rgba(199,122,30,.16)",  fg: "#A8690F" },
};

function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 90) return "1 minute ago";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  return `${diffDay} days ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Swipe-to-dismiss state (mobile, pointer events)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const startXRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/kekere/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Best-effort poll — stale badge is acceptable until next tick.
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    window.addEventListener("focus", fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchNotifications);
    };
  }, [fetchNotifications]);

  async function handleSelect(n: Notification) {
    if (dragId) return; // ignore tap if mid-swipe
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (!n.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetch(`/api/kekere/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  function handleDismiss(id: string) {
    const n = notifications.find((x) => x.id === id);
    if (n && !n.read) setUnreadCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) => prev.filter((x) => x.id !== id));
    fetch(`/api/kekere/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/kekere/notifications/read-all", { method: "PUT" });
    } catch {
      // Self-corrects on next poll.
    }
  }

  // Swipe gesture — touch devices only (pointerType === "touch")
  function onPointerDown(id: string, e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;
    startXRef.current = e.clientX;
    setDragId(id);
    setDragDx(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragId || e.pointerType !== "touch") return;
    setDragDx(Math.min(0, e.clientX - startXRef.current));
  }

  function onPointerUp(id: string) {
    if (!dragId) return;
    if (dragDx < -90) handleDismiss(id);
    setDragId(null);
    setDragDx(0);
  }

  return (
    <>
      {/* Bell button — 40×40, rounded-[11px], filled orange when open */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border transition-colors",
          open
            ? "border-[#C75D2C] bg-[#C75D2C] text-white"
            : "border-[rgba(42,26,18,.12)] bg-white text-[#2A1A12] hover:border-[rgba(42,26,18,.2)]"
        )}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-[3px] -top-[3px] flex min-w-[18px] items-center justify-center rounded-full border-2 border-[#FBF5EC] bg-[#C75D2C] px-1 pb-px text-[10.5px] font-bold leading-none text-white" style={{ height: 18 }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Keyframe animations — injected once when drawer opens */}
          <style>{`
            @keyframes notifDrawerIn { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes notifSheetUp  { from { transform: translateY(100%); }             to { transform: translateY(0); } }
            @keyframes notifFadeIn   { from { opacity: 0; }                              to { opacity: 1; } }
            .notif-sheet  { animation: notifSheetUp  .3s cubic-bezier(.2,.8,.2,1); }
            @media (min-width: 768px) {
              .notif-sheet { animation: notifDrawerIn .28s ease; }
            }
          `}</style>

          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(42,26,18,.3)", animation: "notifFadeIn .2s ease" }}
          />

          {/* Drawer — mobile: bottom sheet · desktop: right-side panel */}
          <div
            className={cn(
              "notif-sheet",
              "fixed z-50 flex flex-col bg-[#FBF5EC]",
              // Mobile — bottom sheet
              "inset-x-0 bottom-0 max-h-[80%] rounded-t-[20px] shadow-[0_-14px_44px_rgba(42,26,18,.25)]",
              // Desktop — right panel
              "md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:w-[396px] md:max-h-none md:rounded-none md:border-l md:border-[rgba(42,26,18,.12)] md:shadow-[-12px_0_40px_rgba(42,26,18,.16)]"
            )}
          >
            {/* Mobile drag handle */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full justify-center py-[9px] pb-1 md:hidden"
              aria-label="Close notifications"
            >
              <span className="h-1 w-10 rounded-full bg-[rgba(42,26,18,.2)]" />
            </button>

            {/* Header */}
            <div className="flex-none flex items-center justify-between border-b border-[rgba(42,26,18,.1)] px-4 py-[14px]">
              <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#2A1A12]">
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="border-none bg-transparent text-[12.5px] font-semibold text-[#C75D2C]"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[rgba(42,26,18,.05)] text-[15px] text-[#2A1A12]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Empty state */}
            {notifications.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-[14px] px-8 py-11 text-center">
                <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[rgba(31,75,75,.1)] text-[#1F4B4B]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#2A1A12]">
                  You&apos;re all caught up
                </p>
                <p className="max-w-[250px] text-[13.5px] leading-[1.5] text-[rgba(42,26,18,.55)]">
                  Notifications about your stories will appear here.
                </p>
              </div>
            )}

            {/* Notification list */}
            {notifications.length > 0 && (
              <div className="flex-1 overflow-y-auto py-[6px]">
                {notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type];
                  if (!config) return null;
                  const { glyph, bg, fg } = config;
                  const dx = dragId === n.id ? dragDx : 0;
                  const isDragging = dragId === n.id;

                  return (
                    <div key={n.id} className="relative overflow-hidden">
                      {/* Red "Delete" background — revealed on swipe */}
                      <div className="absolute inset-0 flex items-center justify-end pr-[22px] bg-[#B3371D] text-[12.5px] font-bold text-white">
                        Delete
                      </div>

                      {/* Row content — slides left on swipe */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelect(n)}
                        onKeyDown={(e) => e.key === "Enter" && handleSelect(n)}
                        onPointerDown={(e) => onPointerDown(n.id, e)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => onPointerUp(n.id)}
                        className="relative flex cursor-pointer gap-3 px-4 py-[13px]"
                        style={{
                          background: "#FBF5EC",
                          borderBottom: "1px solid rgba(42,26,18,.06)",
                          transform: `translateX(${dx}px)`,
                          transition: isDragging ? "none" : "transform .15s ease",
                          touchAction: "pan-y",
                        }}
                      >
                        {/* Glyph icon in tinted circle */}
                        <span
                          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[17px] font-bold"
                          style={{ background: bg, color: fg }}
                        >
                          {glyph}
                        </span>

                        {/* Text content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "flex-1 text-[13.5px] leading-[1.35]",
                                n.read ? "font-medium text-[rgba(42,26,18,.7)]" : "font-bold text-[#2A1A12]"
                              )}
                            >
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="mt-1 h-2 w-2 flex-none rounded-full bg-[#C75D2C]" />
                            )}
                          </div>
                          <p className="mt-[3px] text-[12.5px] leading-[1.45] text-[rgba(42,26,18,.6)]">
                            {n.body}
                          </p>
                          <p className="mt-[5px] text-[11px] text-[rgba(42,26,18,.42)]">
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>

                        {/* Explicit dismiss X — visible on every screen size.
                         * Mobile also has swipe-to-delete (below), but that
                         * gesture has zero visual hint until someone
                         * accidentally discovers it, so this button is the
                         * only *discoverable* way to delete a notification
                         * on the platform most Kekere users are actually on. */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                          aria-label="Dismiss"
                          className="flex-none self-start rounded-[6px] border-none bg-transparent p-[5px] text-[13px] text-[rgba(42,26,18,.35)] hover:bg-[rgba(42,26,18,.08)] hover:text-[#B3371D]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
