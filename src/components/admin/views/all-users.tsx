"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface User {
  id: string;
  name: string;
  email: string;
  role: "READER" | "WRITER" | "ADMIN";
  createdAt: string;
  lastActiveAt: string;
  suspended: boolean;
  storyCount: number;
  unlockCount: number;
}

const ROLE_STYLES: Record<string, string> = {
  READER: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  WRITER: "bg-[rgba(199,93,44,0.12)] text-[#C75D2C]",
  ADMIN: "bg-[rgba(107,33,168,0.12)] text-[#6B21A8]",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

export function AllUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setUsers(d.users ?? []);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function toggleSuspend(user: User) {
    setActing(user.id);
    const endpoint = user.suspended ? `/api/admin/users/${user.id}/unsuspend` : `/api/admin/users/${user.id}/suspend`;
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, suspended: !u.suspended } : u));
      showToast("ok", user.suspended ? "User unsuspended." : "User suspended.");
    } catch {
      showToast("err", "Action failed.");
    } finally {
      setActing(null);
    }
  }

  const ROLES = ["ALL", "READER", "WRITER", "ADMIN"];

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn("fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg", toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]")}>
          {toast.msg}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[340px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-full rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
          />
        </div>
        <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className={cn("px-3.5 py-2 text-[12px] font-semibold rounded-[7px] transition-colors", roleFilter === r ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]")}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-[#8B919A]">{total.toLocaleString()} users</span>
      </div>

      {loading ? (
        <SkeletonTableShell rows={8} cols={6} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : users.length === 0 ? (
        <AdminEmptyState title="No users found" note={search ? `No results for "${search}"` : "No users match the selected filter."} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
            <div className="grid grid-cols-[2fr_2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Stories</span>
              <span>Unlocks</span>
              <span>Last active</span>
              <span className="text-right">Actions</span>
            </div>
            {users.map((u) => (
              <div
                key={u.id}
                className={cn(
                  "grid grid-cols-[2fr_2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5 last:border-0 hover:bg-[#FBFBFC]",
                  u.suspended && "opacity-60"
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#F4F5F7] text-[11px] font-bold text-[#646B73]">
                    {(u.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{u.name}</p>
                    {u.suspended && <span className="text-[10px] font-bold uppercase text-[#C0392B]">Suspended</span>}
                  </div>
                </div>
                <p className="truncate text-[12px] text-[#646B73]">{u.email}</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase w-fit", ROLE_STYLES[u.role] ?? ROLE_STYLES.READER)}>
                  {u.role}
                </span>
                <span className="text-[13px] text-[#1A1C20]">{u.storyCount}</span>
                <span className="text-[13px] text-[#1A1C20]">{u.unlockCount}</span>
                <span className="text-[12px] text-[#8B919A]">{relativeTime(u.lastActiveAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={acting === u.id}
                    onClick={() => toggleSuspend(u)}
                    className={cn(
                      "rounded-[7px] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40",
                      u.suspended
                        ? "bg-[#1F8A5B] text-white hover:bg-[#1a7a50]"
                        : "border border-[#C0392B]/30 text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)]"
                    )}
                  >
                    {acting === u.id ? "…" : u.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-[8px] border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[12px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[12px] text-[#8B919A]">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-[8px] border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[12px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
