"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CompetitionFormValues {
  slug: string;
  title: string;
  theme: string;
  themeDescription: string;
  deadline: string;
  prizeDescription: string;
  wordCountLimit: string;
  /** Empty string means no minimum — a single word-count ceiling rather
   * than a range. */
  wordCountMin: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "JUDGING" | "COMPLETE";
}

const EMPTY: CompetitionFormValues = {
  slug: "",
  title: "",
  theme: "",
  themeDescription: "",
  deadline: "",
  prizeDescription: "",
  wordCountLimit: "3000",
  wordCountMin: "",
  status: "DRAFT",
};

export interface CompetitionFormProps {
  mode: "create" | "edit";
  competitionId?: string;
  initial?: Partial<CompetitionFormValues>;
}

export function CompetitionForm({ mode, competitionId, initial }: CompetitionFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CompetitionFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof CompetitionFormValues>(key: K, value: CompetitionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug: values.slug,
      title: values.title,
      theme: values.theme,
      themeDescription: values.themeDescription,
      deadline: values.deadline,
      prizeDescription: values.prizeDescription,
      wordCountLimit: Number(values.wordCountLimit),
      wordCountMin: values.wordCountMin ? Number(values.wordCountMin) : null,
      status: values.status,
    };

    const res = await fetch(
      mode === "create" ? "/api/kekere/competitions" : `/api/kekere/competitions/${competitionId}`,
      {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/admin/kekere/competitions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={values.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" required value={values.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="theme">Theme (short label)</Label>
        <Input id="theme" required value={values.theme} onChange={(e) => set("theme", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="themeDescription">Theme description (full copy)</Label>
        <Textarea
          id="themeDescription"
          required
          rows={4}
          value={values.themeDescription}
          onChange={(e) => set("themeDescription", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="date"
          required
          value={values.deadline}
          onChange={(e) => set("deadline", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wordCountMin">Minimum word count (optional)</Label>
          <Input
            id="wordCountMin"
            type="number"
            min="1"
            placeholder="No minimum"
            value={values.wordCountMin}
            onChange={(e) => set("wordCountMin", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wordCountLimit">Maximum word count</Label>
          <Input
            id="wordCountLimit"
            type="number"
            min="1"
            required
            value={values.wordCountLimit}
            onChange={(e) => set("wordCountLimit", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="prizeDescription">Prize description</Label>
        <Textarea
          id="prizeDescription"
          required
          rows={2}
          value={values.prizeDescription}
          onChange={(e) => set("prizeDescription", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select value={values.status} onValueChange={(v) => set("status", v as CompetitionFormValues["status"])}>
          <SelectTrigger id="status">
            <SelectValue>{values.status}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="JUDGING">Judging</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create competition" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
