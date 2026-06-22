"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

export interface AuthorFormValues {
  name: string;
  email: string;
  password: string;
  slug: string;
  shortBio: string;
  bio: string;
  avatarColor: string;
  socialLinks: string;
}

const EMPTY: AuthorFormValues = {
  name: "",
  email: "",
  password: "",
  slug: "",
  shortBio: "",
  bio: "",
  avatarColor: "#1E3A8A",
  socialLinks: "",
};

export interface AuthorFormProps {
  mode: "create" | "edit";
  authorId?: string;
  initial?: Partial<AuthorFormValues>;
}

/** Social links are entered one per line as "Label|https://url" — a plain-text
 * stand-in for a repeatable-fields UI, kept simple for this first admin cut. */
function parseSocialLinks(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return { label: label || href, href: href || label };
    });
}

export function AuthorForm({ mode, authorId, initial }: AuthorFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<AuthorFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof AuthorFormValues>(key: K, value: AuthorFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const basePayload = {
      name: values.name,
      slug: values.slug,
      shortBio: values.shortBio || undefined,
      bio: values.bio || undefined,
      avatarColor: values.avatarColor || undefined,
      socialLinks: values.socialLinks ? parseSocialLinks(values.socialLinks) : undefined,
    };

    const payload =
      mode === "create"
        ? { ...basePayload, email: values.email, password: values.password }
        : basePayload;

    const res = await fetch(mode === "create" ? "/api/authors" : `/api/authors/${authorId}`, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/admin/authors");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={values.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" required value={values.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
      </div>

      {mode === "create" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Initial password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shortBio">Short description (used in cards)</Label>
        <Input id="shortBio" value={values.shortBio} onChange={(e) => set("shortBio", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Full bio (separate paragraphs with a blank line)</Label>
        <Textarea id="bio" rows={5} value={values.bio} onChange={(e) => set("bio", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="avatarColor">Avatar colour (hex)</Label>
        <Input id="avatarColor" value={values.avatarColor} onChange={(e) => set("avatarColor", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="socialLinks">
          Social links — one per line, as &quot;Label|https://url&quot;
        </Label>
        <Textarea
          id="socialLinks"
          rows={3}
          value={values.socialLinks}
          onChange={(e) => set("socialLinks", e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create author" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
