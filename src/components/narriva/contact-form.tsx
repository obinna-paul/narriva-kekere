"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT_SUBJECTS } from "@/lib/validation/contact";
import { cn } from "@/lib/utils/cn";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) return <ContactConfirmation />;
  return <ContactIntakeForm onSent={() => setSent(true)} />;
}

function ContactConfirmation() {
  return (
    <div className="py-[60px] text-center">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-[1.2] tracking-[-0.015em] text-[var(--color-ink)]">
        Message sent.
      </h2>
      <p className="mx-auto mt-3 max-w-[380px] text-[15.5px] leading-[1.6] text-[var(--color-muted)]">
        We&apos;ll get back to you soon, usually within a couple of business days.
      </p>
    </div>
  );
}

function ContactIntakeForm({ onSent }: { onSent: () => void }) {
  const formId = useId();
  const [subject, setSubject] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;

    setSubmitting(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });
    setSubmitting(false);

    if (!res.ok) {
      setError("Please check the form for errors and try again.");
      return;
    }

    onSent();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--color-border)] bg-white p-9"
    >
      <div className="flex flex-col gap-[22px]">
        <div className="grid gap-[18px] sm:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input id={`${formId}-name`} name="name" placeholder="Your name" required className="mt-2" />
          </div>
          <div>
            <Label htmlFor={`${formId}-email`}>Email</Label>
            <Input
              id={`${formId}-email`}
              name="email"
              type="email"
              placeholder="you@email.com"
              required
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`${formId}-subject`}>Subject</Label>
          <Select value={subject} onValueChange={setSubject} required>
            <SelectTrigger id={`${formId}-subject`} className="mt-2">
              <SelectValue placeholder="General enquiry" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${formId}-message`}>Message</Label>
          <Textarea
            id={`${formId}-message`}
            name="message"
            rows={6}
            required
            placeholder="How can we help?"
            className="mt-2"
          />
        </div>

        {error && (
          <Body size="sm" className="text-red-600">
            {error}
          </Body>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(buttonVariants({ size: "lg" }), "self-start px-[30px] text-base font-semibold")}
        >
          {submitting ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
