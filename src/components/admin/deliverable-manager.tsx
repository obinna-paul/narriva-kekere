"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Deliverable } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  COVER: "Cover", MANUSCRIPT: "Manuscript", INTERIOR_LAYOUT: "Interior layout",
  MARKETING_ASSET: "Marketing asset", CONTRACT: "Contract", OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review", APPROVED: "Approved", CHANGES_REQUESTED: "Changes requested",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "#f0e8d8", APPROVED: "#d4f0d4", CHANGES_REQUESTED: "#fce4d6",
};

export function DeliverableManager({
  projectId,
  deliverables: initial,
}: {
  projectId: string;
  deliverables: Deliverable[];
}) {
  const router = useRouter();
  const [deliverables, setDeliverables] = useState(initial);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [type, setType] = useState("OTHER");
  const [adding, setAdding] = useState(false);

  async function addDeliverable(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setAdding(true);
    const res = await fetch("/api/admin/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, description: desc, fileUrl: fileUrl || null, type }),
    });
    if (res.ok) {
      const json = await res.json();
      setDeliverables((prev) => [json.deliverable, ...prev]);
      setTitle(""); setDesc(""); setFileUrl(""); setType("OTHER");
      router.refresh();
    }
    setAdding(false);
  }

  return (
    <div>
      <form onSubmit={addDeliverable} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e0e8d8", padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#1F6F4A" }}>+ Add deliverable</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Cover draft v2)" required
            style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }} />
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="File URL (Google Drive, Dropbox, etc.)"
          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description or notes"
          rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", resize: "vertical" }} />
        <button type="submit" disabled={adding}
          style={{ padding: "8px 24px", borderRadius: "8px", background: "#1F6F4A", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
          {adding ? "Adding…" : "Add deliverable"}
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {deliverables.map((d) => (
          <div key={d.id} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: "14px" }}>{d.title}</h4>
              <p style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>{TYPE_LABELS[d.type]}</p>
              {d.description && <p style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>{d.description}</p>}
              {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener" style={{ fontSize: "13px", color: "#C75D2C", display: "inline-block", marginTop: "4px" }}>View file →</a>}
              {d.authorComment && <p style={{ fontSize: "12px", color: "#C75D2C", marginTop: "4px", fontStyle: "italic" }}>Author: {d.authorComment}</p>}
            </div>
            <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: STATUS_COLORS[d.status], color: "#333", whiteSpace: "nowrap" }}>
              {STATUS_LABELS[d.status]}
            </span>
          </div>
        ))}
        {deliverables.length === 0 && <p style={{ color: "#999", fontSize: "14px" }}>No deliverables yet.</p>}
      </div>
    </div>
  );
}
