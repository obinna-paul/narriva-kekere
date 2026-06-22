"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label, Body } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

export function SubmissionForm() {
  const router = useRouter();
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
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

    router.push("/submit/thank-you");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="authorName">Your name</Label>
          <Input id="authorName" name="authorName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="authorEmail">Email</Label>
          <Input id="authorEmail" name="authorEmail" type="email" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manuscriptTitle">Manuscript title</Label>
        <Input id="manuscriptTitle" name="manuscriptTitle" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manuscript">Manuscript file (PDF or Word, up to 25MB)</Label>
        <Input id="manuscript" name="manuscript" type="file" accept=".pdf,.doc,.docx" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="synopsis">Synopsis</Label>
        <Textarea
          id="synopsis"
          name="synopsis"
          required
          rows={5}
          hint="A few paragraphs — what happens, and why it matters."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="targetAudience">Who is this book for?</Label>
        <Textarea id="targetAudience" name="targetAudience" required rows={3} />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="guidelinesAccepted"
          checked={guidelinesAccepted}
          onCheckedChange={(checked) => setGuidelinesAccepted(checked === true)}
          required
        />
        <Label htmlFor="guidelinesAccepted" className="font-normal tracking-normal">
          I&apos;ve read the{" "}
          <Link href="/standards" className="text-[var(--color-primary)] underline">
            submission guidelines
          </Link>{" "}
          and believe this manuscript is ready for review.
        </Label>
      </div>

      {error && (
        <Body size="sm" className="text-red-600">
          {error}
        </Body>
      )}

      <Button type="submit" size="lg" disabled={submitting || !guidelinesAccepted}>
        {submitting ? "Submitting…" : "Submit manuscript"}
      </Button>
    </form>
  );
}
