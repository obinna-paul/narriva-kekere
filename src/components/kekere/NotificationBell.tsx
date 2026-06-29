"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  PenLine,
  XCircle,
  Clock,
  FileText,
  Coins,
  ArrowDownCircle,
  AlertCircle,
  History,
  type LucideIcon,
} from "lucide-react";
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
  | "WITHDRAWAL_PROCESSED"
  | "WITHDRAWAL_REJECTED"
  | "VERSION_RESTORED";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  STORY_APPROVED: { icon: CheckCircle, className: "text-[var(--color-success)]" },
  STORY_REVISIONS_REQUESTED: { icon: PenLine, className: "text-[var(--color-primary)]" },
  STORY_REJECTED: { icon: XCircle, className: "text-[var(--color-ink-muted)]" },
  STORY_SUBMITTED: { icon: Clock, className: "text-blue-600" },
  CONTRACT_RECEIVED: { icon: FileText, className: "text-blue-600" },
  COMPETITION_RESULT: { icon: FileText, className: "text-blue-600" },
  REFERRAL_REWARD_EARNED: { icon: Coins, className: "text-amber-500" },
  WITHDRAWAL_PROCESSED: { icon: ArrowDownCircle, className: "text-[var(--color-success)]" },
  WITHDRAWAL_REJECTED: { icon: AlertCircle, className: "text-[var(--color-ink-muted)]" },
  VERSION_RESTORED: { icon: History, className: "text-[var(--color-ink-muted-2)]" },
};

function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/kekere/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Polling is best-effort — a failed fetch just leaves the existing
      // badge/list as-is until the next successful poll.
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

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function handleSelect(notification: Notification) {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    if (!notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetch(`/api/kekere/notifications/${notification.id}/read`, { method: "PUT" }).catch(() => {});
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/kekere/notifications/read-all", { method: "PUT" });
    } catch {
      // Best-effort — a brief mismatch between local state and the server
      // self-corrects on the next 60s poll.
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-ink)]/[0.06] hover:text-[var(--color-primary)]"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-[var(--color-ink)]/20 md:hidden" aria-hidden="true" />
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] rounded-t-[20px] bg-[var(--color-bg)] p-5 shadow-[0_-18px_50px_-20px_rgba(42,26,18,0.4)]",
              "md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:max-h-[70vh] md:w-[380px] md:rounded-xl md:border md:border-[var(--color-ink)]/10 md:shadow-[0_20px_50px_-20px_rgba(42,26,18,0.3)]"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
                Notifications
              </span>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Mark all as read
              </button>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto md:max-h-[55vh]">
              {notifications.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--color-ink-muted-2)]">
                  Nothing yet — we&apos;ll let you know when something happens.
                </p>
              )}
              {notifications.map((n) => {
                const { icon: Icon, className } = TYPE_ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "relative flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--color-ink)]/[0.04]",
                      !n.read && "bg-[var(--color-primary-muted)]/40"
                    )}
                  >
                    {!n.read && (
                      <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" />
                    )}
                    <Icon size={18} className={cn("mt-0.5 flex-none", className)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13.5px] leading-snug text-[var(--color-ink)]",
                          !n.read && "font-semibold"
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--color-ink-muted-2)]">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-ink-muted-3)]">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
