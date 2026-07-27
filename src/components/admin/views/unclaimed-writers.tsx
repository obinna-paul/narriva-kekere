"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Mail, Plus, Trash2, UserX } from "lucide-react";

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
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

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

  /**
   * Sends the writer their invitation AND puts that same link on the
   * clipboard, in one request.
   *
   * There used to be two buttons doing this separately, and because a claim
   * token is stored hashed only one can ever be live — so copying the link
   * silently killed the one already sitting in the writer's inbox, and vice
   * versa. Whichever they clicked second told them the link was invalid. One
   * action means the link you're holding is always the link they were sent.
   */
  async function sendInvite(writerId: string) {
    setSendingId(writerId);
    setError(null);
    setCopiedId(null);
    try {
      const res = await fetch(`/api/admin/kekere/writers/${writerId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't send the invite.");
        return;
      }
      const data = await res.json();
      // Clipboard access can be refused (permissions, insecure origin). The
      // email has already gone either way, so that's a partial success worth
      // saying out loud rather than a failure.
      try {
        await navigator.clipboard.writeText(data.actionUrl);
        setCopiedId(writerId);
      } catch {
        setError("Emailed — but couldn't copy to your clipboard. Use “New link only” if you need to share it by hand.");
      }
      setSentId(writerId);
      setTimeout(() => {
        setSentId((id) => (id === writerId ? null : id));
        setCopiedId((id) => (id === writerId ? null : id));
      }, 3000);
      await fetchWriters();
    } catch {
      setError("Network error while sending the invite.");
    } finally {
      setSendingId(null);
    }
  }

  /** A fresh link with no email — for sharing by hand. Confirmed, because it
   *  kills any link already sent. */
  async function newLinkOnly(writerId: string, name: string) {
    if (!window.confirm(
      `Generate a new link for ${name}?\n\nOnly one link can be active at a time, so this immediately stops any link you've already sent them from working — including one in an email they haven't opened yet.\n\nThe new link will be copied to your clipboard.`
    )) {
      return;
    }
    setSendingId(writerId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kekere/writers/${writerId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't generate a link.");
        return;
      }
      const data = await res.json();
      try {
        await navigator.clipboard.writeText(data.actionUrl);
        setCopiedId(writerId);
        setTimeout(() => setCopiedId((id) => (id === writerId ? null : id)), 3000);
      } catch {
        window.prompt("Copy this link:", data.actionUrl);
      }
      await fetchWriters();
    } catch {
      setError("Network error while generating the link.");
    } finally {
      setSendingId(null);
    }
  }

  async function deleteWriter(writerId: string, name: string, force = false) {
    if (!force) {
      if (!window.confirm(
        `Delete ${name} completely?\n\nThis removes the account AND everything tied to it — their story, wallet, referral code, and contracts. This cannot be undone.`
      )) {
        return;
      }
    }
    setDeletingId(writerId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kekere/writers/${writerId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.status === 409) {
        // Writer has earned cowries — confirm the override, then retry forced.
        const data = await res.json().catch(() => ({}));
        setDeletingId(null);
        if (window.confirm(`${data.message ?? "This writer has earned cowries."}\n\nDelete anyway?`)) {
          await deleteWriter(writerId, name, true);
        }
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Delete failed" }));
        setError(data.message ?? data.error ?? "Delete failed");
      } else {
        await fetchWriters();
      }
    } catch {
      setError("Network error while deleting the writer.");
    } finally {
      setDeletingId(null);
    }
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
            Writers whose accounts and stories were created by an admin. Any onboarded story can
            be deleted here. Only one invite link works at a time — sending a new one stops the
            previous link from working.
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
                    {w.storyTitle && w.storyId ? (
                      <Link
                        href={`/admin/kekere/stories/${w.storyId}/edit`}
                        className="text-[#15171C] hover:text-[#C75D2C] hover:underline"
                        title="Edit this story"
                      >
                        {w.storyTitle}
                      </Link>
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
                      {/* Send invite — the deliberate step after saving a
                          story. Emails the writer AND copies that same link,
                          so the two can never be different tokens. Only
                          meaningful while a contract is pending (i.e. the
                          story hasn't been signed/published yet). Works for
                          both new (claim link) and existing (in-app contract)
                          writers. */}
                      {w.storyId && w.storyStatus === "PENDING_CONTRACT" && (
                        <button
                          type="button"
                          onClick={() => sendInvite(w.id)}
                          disabled={sendingId === w.id}
                          className="inline-flex items-center gap-1 rounded-[7px] bg-[#C75D2C] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#B0531E] disabled:opacity-50"
                          title="Email the writer their publishing agreement and copy the same link to your clipboard"
                        >
                          <Mail size={12} />
                          {sendingId === w.id
                            ? "Sending…"
                            : sentId === w.id
                              ? copiedId === w.id
                                ? "Sent + copied ✓"
                                : "Sent ✓"
                              : "Send invite"}
                        </button>
                      )}
                      {w.accountStatus === "UNCLAIMED" && (
                        <button
                          type="button"
                          onClick={() => newLinkOnly(w.id, w.name)}
                          disabled={sendingId === w.id}
                          className="inline-flex items-center gap-1 rounded-[7px] bg-[#F0F2F5] px-2.5 py-1.5 text-[11px] font-medium text-[#15171C] hover:bg-[#E4E7EB] disabled:opacity-50"
                          title="Generate a fresh link to share by hand — this invalidates any link already sent"
                        >
                          <RefreshCw size={12} />
                          New link only
                        </button>
                      )}
                      {w.storyId && (
                        <button
                          type="button"
                          onClick={() => deleteStory(w.storyId!, w.storyTitle ?? "this story")}
                          disabled={deletingId === w.storyId}
                          className="inline-flex items-center gap-1 rounded-[7px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Delete story only (keep the writer account)"
                        >
                          <Trash2 size={12} />
                          {deletingId === w.storyId ? "Deleting…" : "Delete story"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteWriter(w.id, w.name)}
                        disabled={deletingId === w.id}
                        className="inline-flex items-center gap-1 rounded-[7px] border border-red-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        title="Delete the whole writer account and all their data"
                      >
                        <UserX size={12} />
                        {deletingId === w.id ? "Deleting…" : "Delete writer"}
                      </button>
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
