"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CompetitionEntryRow {
  id: string;
  storyTitle: string;
  authorName: string;
  storyStatus: string;
  placement: number | null;
}

export interface CompetitionEntriesProps {
  competitionId: string;
  entries: readonly CompetitionEntryRow[];
}

const PLACEMENT_LABELS: Record<string, string> = {
  none: "—",
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
};

export function CompetitionEntries({ competitionId, entries }: CompetitionEntriesProps) {
  const router = useRouter();
  const [placements, setPlacements] = useState<Record<string, string>>(
    Object.fromEntries(entries.map((e) => [e.id, e.placement ? String(e.placement) : "none"]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAndComplete() {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/kekere/competitions/${competitionId}/entries`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placements: Object.entries(placements).map(([entryId, value]) => ({
          entryId,
          placement: value === "none" ? null : Number(value),
        })),
      }),
    });

    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save winners.");
    }
  }

  if (entries.length === 0) {
    return <p className="text-sm text-[var(--color-ink)]/50">No entries yet.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Story</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Story status</th>
              <th className="px-4 py-3 font-medium">Placement</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{entry.storyTitle}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{entry.authorName}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{entry.storyStatus}</td>
                <td className="px-4 py-3">
                  <Select
                    value={placements[entry.id]}
                    onValueChange={(v) => setPlacements((prev) => ({ ...prev, [entry.id]: v }))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue>{PLACEMENT_LABELS[placements[entry.id]]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="1">1st</SelectItem>
                      <SelectItem value="2">2nd</SelectItem>
                      <SelectItem value="3">3rd</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <Button type="button" className="mt-4" disabled={busy} onClick={saveAndComplete}>
        Save winners & mark complete
      </Button>
    </div>
  );
}
