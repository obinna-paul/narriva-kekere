"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubmissionWithUpdates } from "@/lib/data/submissions";

const STATUSES = ["RECEIVED", "READING", "REVIEWED", "ACCEPTED", "DECLINED"] as const;
const STAGES = ["SUBMITTED", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"] as const;

export interface SubmissionControlsProps {
  submission: SubmissionWithUpdates;
}

export function SubmissionControls({ submission }: SubmissionControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(submission.status);
  const [stage, setStage] = useState(submission.currentStage ?? "SUBMITTED");
  const [notes, setNotes] = useState(submission.reviewerNotes ?? "");
  const [newUpdate, setNewUpdate] = useState("");
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else window.alert("Couldn't save — check the console.");
  }

  async function postUpdate() {
    if (!newUpdate.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/submissions/${submission.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newUpdate }),
    });
    setBusy(false);
    if (res.ok) {
      setNewUpdate("");
      router.refresh();
    } else {
      window.alert("Couldn't post update — check the console.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <div className="flex gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={busy || status === submission.status}
              onClick={() => patch({ status })}
            >
              Update
            </Button>
          </div>
        </div>

        {submission.status === "ACCEPTED" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage">Author Portal stage</Label>
            <div className="flex gap-2">
              <Select value={stage} onValueChange={(v) => setStage(v as typeof stage)}>
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={busy || stage === submission.currentStage}
                onClick={() => patch({ currentStage: stage })}
              >
                Advance
              </Button>
            </div>
          </div>
        )}
      </div>

      {submission.status === "ACCEPTED" && (
        <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-4">
          <p className="text-sm text-[var(--color-ink)]/80">
            This manuscript is accepted. Creating its Book record is a separate manual
            step for now.
          </p>
          <Link
            href={`/admin/books/new?title=${encodeURIComponent(submission.manuscriptTitle)}`}
            className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Create the Book record →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reviewerNotes">Reviewer notes</Label>
        <Textarea
          id="reviewerNotes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div>
          <Button
            type="button"
            size="sm"
            disabled={busy || notes === (submission.reviewerNotes ?? "")}
            onClick={() => patch({ reviewerNotes: notes })}
          >
            Save notes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label as="span">Communication log</Label>
        <div className="flex flex-col gap-3">
          {submission.updates.length === 0 && (
            <p className="text-sm text-[var(--color-ink)]/50">No updates posted yet.</p>
          )}
          {submission.updates.map((update) => (
            <div key={update.id} className="rounded-md border border-[var(--color-ink)]/10 p-3">
              <p className="text-xs text-[var(--color-ink)]/50">
                {update.createdAt.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 text-sm">{update.note}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            placeholder="Post a dated update visible to the author in their portal…"
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
          />
          <div>
            <Button type="button" size="sm" disabled={busy || !newUpdate.trim()} onClick={postUpdate}>
              Post update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
