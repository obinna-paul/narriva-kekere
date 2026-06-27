"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const GENRES = [
  "Literary Fiction",
  "Family Saga",
  "Speculative Fiction",
  "Romance",
  "Crime & Thriller",
  "Non-fiction",
  "Poetry",
  "Other",
];

const STAGES = [
  "I haven't started writing yet",
  "Early draft",
  "First complete draft",
  "Revised and edited",
  "Very close to publication-ready",
];

const SUPPORT_OPTIONS = [
  "Developmental editing",
  "Line editing",
  "Cover design",
  "Full publishing service",
  "Ghostwriting",
  "Not sure yet — I need an assessment",
];

/**
 * Handles both states the design shows in the same right-hand column: the
 * intake form, and — after a successful submit — an inline confirmation in
 * its place (no route change; the sticky left context panel in
 * src/app/(narriva)/submit/page.tsx stays mounted across both).
 */
export function SubmissionForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return <SubmissionConfirmation />;
  return <SubmissionIntakeForm onSubmitted={() => setSubmitted(true)} />;
}

function SubmissionConfirmation() {
  return (
    <div className="py-[60px]">
      <div className="mb-[30px] h-px w-10 bg-[var(--color-accent)]" />
      <h2 className="font-[family-name:var(--font-display)] text-4xl font-medium leading-[1.14] tracking-[-0.015em] text-[var(--color-ink)]">
        We have your manuscript.
      </h2>
      <p className="mt-[22px] max-w-[440px] text-lg leading-[1.6] text-[var(--color-muted)]">
        Expect to hear from us within six to eight weeks with an assessment and a
        suggested plan. If we have questions before then, we&apos;ll reach out.
      </p>
      <div className="mt-9 flex items-center gap-5">
        <Link href="/books" className={cn(buttonVariants({ size: "lg" }), "px-[26px] py-3.5")}>
          Browse the bookstore
        </Link>
        <Link
          href="/"
          className="border-b border-[var(--color-primary)]/30 text-[15px] text-[var(--color-primary)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function SubmissionIntakeForm({ onSubmitted }: { onSubmitted: () => void }) {
  const formId = useId();
  const [genre, setGenre] = useState("");
  const [manuscriptStage, setManuscriptStage] = useState("");
  const [supportNeeded, setSupportNeeded] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleSupport(option: string) {
    setSupportNeeded((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const aboutBook = (form.elements.namedItem("aboutBook") as HTMLTextAreaElement).value;

    const formData = new FormData();
    formData.set("authorName", (form.elements.namedItem("authorName") as HTMLInputElement).value);
    formData.set("authorEmail", (form.elements.namedItem("authorEmail") as HTMLInputElement).value);
    formData.set("manuscriptTitle", (form.elements.namedItem("manuscriptTitle") as HTMLInputElement).value);
    formData.set("genre", genre);
    formData.set("manuscriptStage", manuscriptStage);
    // The design combines "synopsis" and "who it's for" into one field —
    // our backend still tracks them separately, so the same text backs both.
    formData.set("synopsis", aboutBook);
    formData.set("targetAudience", aboutBook);
    supportNeeded.forEach((s) => formData.append("supportNeeded", s));
    if (file) formData.set("manuscript", file);
    formData.set("guidelinesAccepted", String(guidelinesAccepted));

    setSubmitting(true);
    const res = await fetch("/api/submissions", { method: "POST", body: formData });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "Invalid input" || body.error === "Invalid manuscript file"
          ? "Please check the form for errors and try again."
          : body.error ?? "Something went wrong. Please try again."
      );
      return;
    }

    onSubmitted();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${formId}-authorName`}>Your name</Label>
          <Input id={`${formId}-authorName`} name="authorName" placeholder="Full name" required className="mt-2" />
        </div>
        <div>
          <Label htmlFor={`${formId}-authorEmail`}>Email address</Label>
          <Input
            id={`${formId}-authorEmail`}
            name="authorEmail"
            type="email"
            placeholder="you@email.com"
            required
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${formId}-manuscriptTitle`}>Manuscript title</Label>
        <Input
          id={`${formId}-manuscriptTitle`}
          name="manuscriptTitle"
          placeholder="The working title is fine"
          required
          className="mt-2"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${formId}-genre`}>Genre / Category</Label>
          <Select value={genre} onValueChange={setGenre} required>
            <SelectTrigger id={`${formId}-genre`} className="mt-2">
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`${formId}-stage`}>Where your manuscript is right now</Label>
          <Select value={manuscriptStage} onValueChange={setManuscriptStage} required>
            <SelectTrigger id={`${formId}-stage`} className="mt-2">
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>What kind of support you&apos;re looking for</Label>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          {SUPPORT_OPTIONS.map((option) => (
            <label
              key={option}
              className={cn(
                "flex items-center gap-[11px] rounded-[3px] border bg-white px-[15px] py-[13px] text-[14.5px] text-[#2A2620] transition-colors",
                supportNeeded.includes(option)
                  ? "border-[var(--color-primary)]"
                  : "border-[var(--color-ink)]/[0.14] hover:border-[var(--color-primary)]"
              )}
            >
              <Checkbox
                checked={supportNeeded.includes(option)}
                onCheckedChange={() => toggleSupport(option)}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor={`${formId}-aboutBook`}>Tell us about your book</Label>
        <div className="-mt-0.5 mb-2 text-[13px] text-[var(--color-muted-3)]">
          A short synopsis and who you think will read it · minimum 100 words
        </div>
        <Textarea
          id={`${formId}-aboutBook`}
          name="aboutBook"
          rows={5}
          required
          placeholder="What is your book about, and who is it for?"
        />
      </div>

      <div>
        <Label>Upload your manuscript</Label>
        <label
          className={cn(
            "mt-2 block cursor-pointer rounded border-[1.5px] border-dashed bg-white px-[30px] py-[30px] text-center transition-colors",
            dragOver ? "border-[var(--color-primary)] bg-[var(--color-primary)]/[0.02]" : "border-[var(--color-ink)]/20"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
        >
          <div className="text-[15px] font-medium text-[#2A2620]">
            {file ? file.name : "Drop your file here, or click to browse"}
          </div>
          <div className="mt-1.5 text-[13px] text-[var(--color-muted-3)]">PDF or DOCX, up to 50MB</div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            required={!file}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-[11px] text-[14.5px] text-[#2A2620]">
        <Checkbox
          checked={guidelinesAccepted}
          onCheckedChange={(checked) => setGuidelinesAccepted(checked === true)}
          required
        />
        I&apos;ve read the{" "}
        <Link
          href="/how-we-work-together"
          className="border-b border-[var(--color-primary)]/30 text-[var(--color-primary)]"
        >
          submission guidelines
        </Link>
      </label>

      {error && (
        <Body size="sm" className="text-red-600">
          {error}
        </Body>
      )}

      <button
        type="submit"
        disabled={submitting || !guidelinesAccepted}
        className={cn(buttonVariants({ size: "lg" }), "mt-1.5 self-start px-8 text-base font-semibold")}
      >
        {submitting ? "Submitting…" : "Submit my manuscript"}
      </button>

      <p className="mt-1 text-[13.5px] italic leading-[1.6] text-[var(--color-muted-3)]">
        We&apos;ll come back to you within six to eight weeks of receiving your submission with
        an assessment and a suggested plan. If we have questions before then, we&apos;ll reach
        out.
      </p>
    </form>
  );
}
