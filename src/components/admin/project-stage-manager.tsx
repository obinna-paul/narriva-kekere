"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "INQUIRY", "CONTRACT_SENT", "ONBOARDING", "MANUSCRIPT_REVIEW",
  "DEVELOPMENTAL_EDIT", "COPYEDIT", "COVER_DESIGN", "INTERIOR_TYPESET",
  "AUTHOR_REVIEW", "PROOFREAD", "PRINTING", "MARKETING", "RELEASED",
] as const;

const LABELS: Record<string, string> = {
  INQUIRY: "Inquiry", CONTRACT_SENT: "Contract sent", ONBOARDING: "Onboarding",
  MANUSCRIPT_REVIEW: "Manuscript review", DEVELOPMENTAL_EDIT: "Dev edit",
  COPYEDIT: "Copyedit", COVER_DESIGN: "Cover design", INTERIOR_TYPESET: "Interior",
  AUTHOR_REVIEW: "Author review", PROOFREAD: "Proofread", PRINTING: "Printing",
  MARKETING: "Marketing", RELEASED: "Released",
};

export function ProjectStageManager({
  projectId,
  currentStage,
  stageNote,
}: {
  projectId: string;
  currentStage: string;
  stageNote: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [note, setNote] = useState(stageNote ?? "");
  const [saving, setSaving] = useState(false);

  async function update() {
    setSaving(true);
    await fetch(`/api/admin/deliverables/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, stageNote: note }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "20px", marginBottom: "24px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Project Stage</h2>
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "12px" }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{LABELS[s]}</option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Stage note (visible to author)"
        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }}
      />
      <button
        onClick={update}
        disabled={saving}
        style={{ padding: "8px 24px", borderRadius: "8px", background: "#C75D2C", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
      >
        {saving ? "Saving…" : "Update stage"}
      </button>
    </div>
  );
}
