"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

export interface ServiceFormValues {
  slug: string;
  title: string;
  tagline: string;
  opening: string;
  included: string;
  closing: string;
  costClarity: string;
  faqs: string;
  order: string;
}

const EMPTY: ServiceFormValues = {
  slug: "",
  title: "",
  tagline: "",
  opening: "",
  included: "",
  closing: "",
  costClarity: "",
  faqs: "",
  order: "0",
};

export interface ServiceFormProps {
  mode: "create" | "edit";
  initial?: Partial<ServiceFormValues>;
}

// "Title|Description" and "Question|Answer" per line stand in for a
// repeatable-fields UI — same simplification as the author form's social
// links, kept consistent across this first admin cut.
function parsePairs(text: string, keys: [string, string]) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split("|").map((part) => part.trim());
      return { [keys[0]]: a ?? "", [keys[1]]: b ?? "" };
    });
}

export function ServiceForm({ mode, initial }: ServiceFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ServiceFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug: values.slug,
      title: values.title,
      order: Number(values.order) || 0,
      content: {
        tagline: values.tagline,
        opening: values.opening,
        included: parsePairs(values.included, ["title", "description"]),
        closing: values.closing,
        costClarity: values.costClarity,
        faqs: parsePairs(values.faqs, ["question", "answer"]),
      },
    };

    const res = await fetch(
      mode === "create" ? "/api/services" : `/api/services/${values.slug}`,
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

    router.push("/admin/services");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={values.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug (matches /services/[slug])</Label>
          <Input
            id="slug"
            required
            disabled={mode === "edit"}
            value={values.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tagline">Tagline (short, italic, shown under the title)</Label>
        <Input id="tagline" required value={values.tagline} onChange={(e) => set("tagline", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="opening">Opening paragraph</Label>
        <Textarea id="opening" required rows={3} value={values.opening} onChange={(e) => set("opening", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="included">
          What&apos;s included — one per line, as &quot;Title|Description&quot;
        </Label>
        <Textarea id="included" required rows={5} value={values.included} onChange={(e) => set("included", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="closing">Closing paragraph</Label>
        <Textarea id="closing" required rows={3} value={values.closing} onChange={(e) => set("closing", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="costClarity">Cost-clarity paragraph</Label>
        <Textarea
          id="costClarity"
          required
          rows={3}
          value={values.costClarity}
          onChange={(e) => set("costClarity", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="faqs">
          FAQs — one per line, as &quot;Question|Answer&quot;
        </Label>
        <Textarea id="faqs" required rows={6} value={values.faqs} onChange={(e) => set("faqs", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order">Display order</Label>
        <Input id="order" type="number" value={values.order} onChange={(e) => set("order", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
