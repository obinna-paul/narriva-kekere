"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DbTier = "STANDARD" | "FEATURED" | "CHAMPION";

export interface KekereStoryDecisionProps {
  storyId: string;
  currentTier: DbTier;
  currentCowrieCost: number;
  currentPlagiarismFlagged: boolean;
}

export function KekereStoryDecision({
  storyId,
  currentTier,
  currentCowrieCost,
  currentPlagiarismFlagged,
}: KekereStoryDecisionProps) {
  const router = useRouter();
  const [tier, setTier] = useState<DbTier>(currentTier);
  const [cowrieCost, setCowrieCost] = useState(String(currentCowrieCost));
  const [plagiarismFlagged, setPlagiarismFlagged] = useState(currentPlagiarismFlagged);
  const [moderationNotes, setModerationNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(action: "approve" | "request_revisions" | "reject") {
    if (action !== "approve" && !moderationNotes.trim()) {
      setError("Feedback is required for revisions or rejection.");
      return;
    }
    setError(null);
    setBusy(true);

    const payload: Record<string, unknown> = { action, plagiarismFlagged };
    if (action === "approve") {
      payload.tier = tier;
      payload.cowrieCost = Number(cowrieCost);
    } else {
      payload.moderationNotes = moderationNotes;
    }

    const res = await fetch(`/api/kekere/stories/${storyId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);
    if (res.ok) {
      router.push("/admin/kekere/stories");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-[var(--color-ink)]/10 p-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tier">Tier (used if approved)</Label>
          <Select value={tier} onValueChange={(v) => setTier(v as DbTier)}>
            <SelectTrigger id="tier">
              <SelectValue>{tier}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="FEATURED">Featured</SelectItem>
              <SelectItem value="CHAMPION">Champion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cowrieCost">Cowrie cost (used if approved)</Label>
          <Input
            id="cowrieCost"
            type="number"
            min="0"
            value={cowrieCost}
            onChange={(e) => setCowrieCost(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="moderationNotes">Feedback (required for revisions / rejection)</Label>
        <Textarea
          id="moderationNotes"
          rows={4}
          value={moderationNotes}
          onChange={(e) => setModerationNotes(e.target.value)}
          placeholder="Visible to the writer — be specific about what needs to change."
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="plagiarismFlagged"
          checked={plagiarismFlagged}
          onCheckedChange={(c) => setPlagiarismFlagged(c === true)}
        />
        <Label htmlFor="plagiarismFlagged" className="font-normal tracking-normal">
          Flag as suspected plagiarism
        </Label>
      </div>
      <p className="-mt-4 text-xs text-[var(--color-ink)]/50">
        Manual flag for admin record-keeping only — there&apos;s no automated plagiarism
        detection (that would need an external API and is out of scope here).
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => decide("approve")}>
          Approve & publish
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => decide("request_revisions")}>
          Request revisions
        </Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={() => decide("reject")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
