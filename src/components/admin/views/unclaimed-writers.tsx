"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, RefreshCw, Mail } from "lucide-react";

interface UnclaimedWriter {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  claimTokenExpiresAt: string | null;
  storyCount: number;
  storyTitle: string | null;
  storyStatus: string | null;
}

export function UnclaimedWriters() {
  const [writers, setWriters] = useState<UnclaimedWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (loading) return <div className="p-8 text-[13px] text-[#7C828C]">Loading...</div>;
  if (error) return <div className="p-8 text-[13px] text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-[#15171C]">Unclaimed Writers</h1>
        <p className="mt-1 text-[13px] text-[#7C828C]">
          Writers whose accounts were created by an admin and haven&rsquo;t claimed them yet.
          Share the claim link via WhatsApp or email.
        </p>
      </div>

      {writers.length === 0 ? (
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-8 text-center text-[13px] text-[#7C828C]">
          No unclaimed writers. Use the &ldquo;New Writer &amp; Story&rdquo; button from the sidebar to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[rgba(20,22,26,0.06)] bg-[#F8F9FB]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Writer</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Email</th>
                <th className="px-4 py-3 font-semibold text-[#15171C]">Story</th>
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
                  <td className="px-4 py-3 text-[#7C828C]">
                    {w.claimTokenExpiresAt
                      ? new Date(w.claimTokenExpiresAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
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
                        title="Resend email"
                      >
                        <Mail size={13} />
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
