"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Mail, Plus, Trash2 } from "lucide-react";

interface OnboardedWriter {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  accountStatus: string;
  claimTokenExpiresAt: string | null;
  storyCount: number;
  storyId: string | null;
  storyTitle: string | null;
  storyStatus: string | null;
}

export function UnclaimedWriters() {
  const router = useRouter();
  const [writers, setWriters] = useState<OnboardedWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchWriters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kekere/writers/unclaimed");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWriters(data.writers ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWriters(); }, [fetchWriters]);

  async function handleCreateWriter(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/kekere/writers/placeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setCreateError(data.error ?? "Failed to create writer");
        setCreating(false);
        return;
      }

      const data = await res.json();
      router.push(`/admin/kekere/writers/${data.userId}/author-story`);
    } catch {
      setCreateError("Network error");
      setCreating(false);
    }
  }

  async function copyClaimLink(writerId: string) {
    setCopiedId(writerId);
    try {
      const res = await fetch(`/api/admin/kekere/writers/${writerId}/regenerate-claim`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.claimUrl);
      }
      await fetchWriters();
    } catch {
      // ignore
    }
    setCopiedId(null);
  }

  async function regenerateLink(writerId: string) {
    const res = await fetch(`/api/admin/kekere/writers/${writerId}/regenerate-claim`, { method: "POST" });
    if (res.ok) {
      await fetchWriters();
    }
  }

  async function resendEmail(writerId: string) {
    await fetch(`/api/admin/kekere/writers/${writerId}/resend-email`, { method: "POST" });
  }

  async function deleteStory(storyId: string, storyTitle: string) {
    if (!window.confirm(`Delete "${storyTitle}" completely? This removes the story from the app and cannot be undone.`)) {
      return;
    }
    setDeletingId(storyId);
    setError(null);
    try {
      const res = await fetch("/api/admin/kekere/stories/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // force: true so a story that already went live (PUBLISHED) can still
        // be deleted — the endpoint refuses published stories otherwise.
        body: JSON.stringify({ storyId, force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Delete failed" }));
        setError(data.message ?? data.error ?? "Delete failed");
      } else {
        await fetchWriters();
      }
    } catch {
      setError("Network error while deleting the story.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className="p-8 text-[13px] text-[#7C828C]">Loading...</div>;
  if (error) return <div className="p-8 text-[13px] text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#15171C]">Onboarded Writers</h1>
          <p className="mt-1 text-[13px] text-[#7C828C]">
            Writers whose accounts and stories were created by an admin. Unclaimed ones can be
            sent a claim link; any onboarded story can be deleted here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setCreateError(null); }}
          className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C75D2C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#B0531E] sm:self-auto"
        >
          <Plus size={14} />
          New Writer &amp; Story
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-4 sm:p-5">
          <form onSubmit={handleCreateWriter} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
                Writer&rsquo;s name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full rounded-[8px] border border-[rgba(20,22,26,0.12)] bg-white px-3 py-2 text-[13px] text-[#15171C] placeholder:text-[#B0B5BD] focus:border-[#C75D2C] focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
                Writer&rsquo;s email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="writer@example.com"
                required
                className="w-full rounded-[8px] border border-[rgba(20,22,26,0.12)] bg-white px-3 py-2 text-[13px] text-[#15171C] placeholder:text-[#B0B5BD] focus:border-[#C75D2C] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim() || !newEmail.trim()}
              className="rounded-[8px] bg-[#C75D2C] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {creating ? "Creating..." : "Create & author story"}
            </button>
          </form>
          {createError && (
            <p className="mt-3 text-[12px] text-red-600">{createError}</p>
          )}
        </div>
      )}

      {writers.length === 0 && !showForm ? (
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-8 text-center text-[13px] text-[#7C828C]">
          No onboarded writers yet. Click &ldquo;New Writer &amp; Story&rdquo; above to create one and author their first story.
        </div>
      ) : writers.length === 0 ? null : (
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[rgba(20,22,26,0.06)] bg-[#F8F9FB]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Writer</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Email</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Story</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Account</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Expires</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(20,22,26,0.06)]">
              {writers.map((w) => (
                <tr key={w.id} className="hover:bg-[rgba(20,22,26,0.02)]">
                  <td className="px-4 py-3 font-medium text-[#15171C]">{w.name}</td>
                  <td className="px-4 py-3 text-[#7C828C]">{w.email}</td>
                  <td className="px-4 py-3">
                    {w.storyTitle ? (
                      <span className="text-[#15171C]">{w.storyTitle}</span>
                    ) : (
                      <Link
                        href={`/admin/kekere/writers/${w.id}/author-story`}
                        className="text-[#C75D2C] hover:underline"
                      >
                        + Author a story
                      </Link>
                    )}
                    {w.storyStatus && (
                      <span className="ml-2 rounded-full bg-[#FFFCF6] px-2 py-0.5 text-[10px] font-medium text-[#B7791F]">
                        {w.storyStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        w.accountStatus === "CLAIMED"
                          ? "bg-[#ECFDF3] text-[#1F7A45]"
                          : "bg-[#F0F2F5] text-[#7C828C]"
                      }`}
                    >
                      {w.accountStatus === "CLAIMED" ? "Claimed" : "Unclaimed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#7C828C]">
                    {w.accountStatus === "UNCLAIMED" && w.claimTokenExpiresAt
                      ? new Date(w.claimTokenExpiresAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {w.accountStatus === "UNCLAIMED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyClaimLink(w.id)}
                            className="inline-flex items-center gap-1 rounded-[7px] bg-[#F0F2F5] px-2.5 py-1.5 text-[11px] font-medium text-[#15171C] hover:bg-[#E4E7EB]"
                          >
                            <Copy size={12} />
                            {copiedId === w.id ? "Copied" : "Copy link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => regenerateLink(w.id)}
                            className="rounded-[7px] p-1.5 text-[#7C828C] hover:bg-[#F0F2F5] hover:text-[#15171C]"
                            title="Regenerate link"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => resendEmail(w.id)}
                            className="rounded-[7px] p-1.5 text-[#7C828C] hover:bg-[#F0F2F5] hover:text-[#15171C]"
                            title="Resend agreement email"
                          >
                            <Mail size={13} />
                          </button>
                        </>
                      )}
                      {w.storyId && (
                        <button
                          type="button"
                          onClick={() => deleteStory(w.storyId!, w.storyTitle ?? "this story")}
                          disabled={deletingId === w.storyId}
                          className="inline-flex items-center gap-1 rounded-[7px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Delete story completely"
                        >
                          <Trash2 size={12} />
                          {deletingId === w.storyId ? "Deleting…" : "Delete story"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
