"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Download, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ContractSummary {
  id: string;
  contractType: string;
  storyTitle?: string;
  sentAt: string;
  status: "PENDING" | "SIGNED" | "DECLINED" | "EXPIRED" | "VOIDED";
  signedAt?: string;
  signedPdfRef?: string;
}

interface ContractDetail {
  id: string;
  contractType: string;
  body: string;
  status: string;
  sentAt: string;
  signedAt?: string;
  signedName?: string;
  signedPdfRef?: string;
  expiresAt?: string;
}

export function ContractsInbox({ contracts, writerName = "" }: { contracts: ContractSummary[]; writerName?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedName, setSignedName] = useState(writerName);
  const [editingName, setEditingName] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const pending = contracts.filter((c) => c.status === "PENDING");
  const archive = contracts.filter((c) => c.status !== "PENDING");

  async function openDetail(id: string) {
    setSelectedId(id);
    setLoading(true);
    try {
      const res = await fetch(`/api/kekere/contracts/${id}`);
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch {}
    setLoading(false);
  }

  async function handleSign() {
    if (!detail || !signedName.trim()) return;
    setSigning(true);
    setSignError(null);
    try {
      const res = await fetch(`/api/kekere/contracts/${detail.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName: signedName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSigned(true);
        setDownloadUrl(data.downloadUrl ?? null);
      } else {
        setSignError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSignError("Network error. Please check your connection and try again.");
    }
    setSigning(false);
  }

  async function handleDecline() {
    if (!detail) return;
    try {
      await fetch(`/api/kekere/contracts/${detail.id}/decline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "" }) });
      setSelectedId(null);
      setDetail(null);
    } catch {}
  }

  function goBack() {
    setSelectedId(null);
    setDetail(null);
    setSigned(false);
    setSignedName("");
  }

  // Detail view (reading contract)
  if (detail) {
    return (
      <div className="mx-auto max-w-[402px] px-[22px] pb-[80px] pt-6">
        <button type="button" onClick={goBack} className="flex items-center gap-2 text-[14px] text-[#8A7565] hover:text-[#2A1A12]">
          <ArrowLeft size={15} /> Back
        </button>
        {loading ? (
          <p className="mt-12 text-center text-[14px] text-[#A08C7C]">Loading contract...</p>
        ) : (
          <>
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#C75D2C]" />
                <span className="text-[13px] font-medium text-[#8A7565]">{detail.contractType}</span>
              </div>
              <div className="mt-4 font-[family-name:var(--font-display)] text-[17px] leading-[1.65] text-[#2A1A12] whitespace-pre-wrap">
                {detail.body}
              </div>
              <p className="mt-4 text-[12px] text-[#A08C7C]">Sent {new Date(detail.sentAt).toLocaleDateString()}</p>

              {detail.status === "PENDING" && !signed && (
                <div className="mt-6 border-t border-[rgba(42,26,18,0.08)] pt-5">
                  <p className="mb-3 text-[13px] leading-[1.55] text-[#5A4535]">
                    By tapping <strong>I accept</strong>, you agree to the terms above and sign this contract as:
                  </p>
                  <div className="mb-4 rounded-[12px] border border-[rgba(42,26,18,0.12)] bg-white px-4 py-3">
                    <p className="font-[family-name:var(--font-display)] text-[17px] italic text-[#2A1A12]">
                      {signedName || "—"}
                    </p>
                    {!editingName && (
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="mt-1 text-[11px] text-[#A08C7C] hover:text-[#C75D2C]"
                      >
                        Not you? Edit name
                      </button>
                    )}
                    {editingName && (
                      <input
                        autoFocus
                        value={signedName}
                        onChange={(e) => setSignedName(e.target.value)}
                        onBlur={() => { if (signedName.trim()) setEditingName(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && signedName.trim()) setEditingName(false); }}
                        placeholder="Type your full name"
                        className="mt-2 w-full bg-transparent text-[16px] italic text-[#2A1A12] outline-none placeholder:text-[#C0A88C]"
                      />
                    )}
                  </div>
                  {signError && (
                    <p className="mb-3 rounded-[10px] bg-[rgba(193,58,58,0.08)] px-4 py-3 text-[13px] text-[#A13A3A]">
                      {signError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSign}
                    disabled={signing || !signedName.trim()}
                    className="w-full rounded-[14px] bg-[#1F8A5B] py-4 text-[16px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(31,138,91,0.55)] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {signing ? "Signing…" : "I accept — sign contract"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="mt-3 w-full rounded-[14px] border border-[rgba(42,26,18,0.12)] py-3 text-[14px] font-medium text-[#8A7565] transition-colors hover:bg-[rgba(42,26,18,0.04)]"
                  >
                    Decline
                  </button>
                </div>
              )}

              {detail.status === "SIGNED" && (
                <div className="mt-6 rounded-[16px] bg-[#1F8A5B]/10 px-4 py-4">
                  <div className="text-[14px] font-semibold text-[#1F8A5B]">Signed successfully</div>
                  <p className="mt-1 text-[12px] text-[#1F8A5B]/70">Signed as {detail.signedName} on {detail.signedAt ? new Date(detail.signedAt).toLocaleDateString() : ""}</p>
                  {detail.signedPdfRef && (
                    <button type="button" onClick={async () => { const r = await fetch(`/api/kekere/contracts/${detail.id}/download`); if (r.ok) { const d = await r.json(); window.location.href = d.downloadUrl; } }} className="mt-3 flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1F8A5B]">
                      <Download size={14} /> Download PDF
                    </button>
                  )}
                </div>
              )}

              {signed && (
                <div className="mt-6 rounded-[16px] bg-[#1F8A5B]/10 px-4 py-4">
                  <div className="text-[14px] font-semibold text-[#1F8A5B]">Signed successfully</div>
                  {downloadUrl && (
                    <button type="button" onClick={() => { window.location.href = downloadUrl; }} className="mt-3 flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1F8A5B]">
                      <Download size={14} /> Download signed PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Inbox view
  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[80px] pt-6">
      <h1 className="font-[family-name:var(--font-display)] text-[26px] font-semibold text-[#2A1A12]">Contracts</h1>

      {pending.length > 0 && (
        <div className="mt-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C75D2C]">Needs your signature</h2>
          <div className="mt-2 flex flex-col gap-[10px]">
            {pending.map((c) => (
              <button key={c.id} type="button" onClick={() => openDetail(c.id)} className="flex items-center gap-3 rounded-[16px] border border-[#C75D2C]/30 bg-white px-4 py-4 text-left transition-colors hover:border-[#C75D2C]">
                <div className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[14px] bg-[#C75D2C]/10">
                  <FileText size={18} className="text-[#C75D2C]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[#2A1A12]">{c.contractType}</div>
                  <div className="text-[12px] text-[#8A7565]">Received {new Date(c.sentAt).toLocaleDateString()}</div>
                </div>
                <div className="flex-none">
                  <span className="rounded-full bg-[#C75D2C]/12 px-2.5 py-1 text-[11px] font-medium text-[#C75D2C]">Pending</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {archive.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8A7565]">Earlier</h2>
          <div className="mt-2 flex flex-col gap-[2px]">
            {archive.map((c) => (
              <button key={c.id} type="button" onClick={() => openDetail(c.id)} className="flex items-center gap-3 rounded-[13px] px-3 py-3 text-left transition-colors hover:bg-[rgba(42,26,18,0.03)]">
                <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[12px] bg-[rgba(42,26,18,0.06)]">
                  <FileText size={15} className="text-[#8A7565]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[#2A1A12]">{c.contractType}</div>
                  <div className="text-[12px] text-[#8A7565]">{new Date(c.sentAt).toLocaleDateString()}</div>
                </div>
                <div className={cn("flex-none rounded-full px-2.5 py-1 text-[11px] font-medium",
                  c.status === "SIGNED" ? "bg-[#1F8A5B]/10 text-[#1F8A5B]" :
                  c.status === "DECLINED" ? "bg-[#C0392B]/10 text-[#C0392B]" :
                  "bg-[rgba(42,26,18,0.08)] text-[#8A7565]"
                )}>
                  {c.status === "SIGNED" ? "Signed" : c.status === "DECLINED" ? "Declined" : c.status === "EXPIRED" ? "Expired" : c.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {contracts.length === 0 && (
        <p className="mt-12 text-center text-[14px] text-[#A08C7C]">No contracts yet. When a publishing contract is sent to you, it will appear here.</p>
      )}
    </div>
  );
}
