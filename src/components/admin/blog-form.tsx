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
import { RichTextEditor } from "@/components/admin/rich-text-editor";

const CATEGORIES = [
  { value: "WRITING_CRAFT", label: "Writing Craft" },
  { value: "PUBLISHING_ADVICE", label: "Publishing Advice" },
  { value: "AUTHOR_SPOTLIGHT", label: "Author Spotlight" },
  { value: "KEKERE_FEATURE", label: "Kekere Feature" },
  { value: "BEHIND_THE_SCENES", label: "Behind the Scenes" },
] as const;

export interface BlogFormValues {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverColor: string;
  category: (typeof CATEGORIES)[number]["value"];
  tags: string;
  authorName: string;
  status: "DRAFT" | "PUBLISHED";
}

const EMPTY: BlogFormValues = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverColor: "#1E3A8A",
  category: "WRITING_CRAFT",
  tags: "",
  authorName: "",
  status: "DRAFT",
};

export interface BlogFormProps {
  mode: "create" | "edit";
  initial?: Partial<BlogFormValues>;
}

export function BlogForm({ mode, initial }: BlogFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BlogFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug: values.slug,
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      coverColor: values.coverColor,
      category: values.category,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      authorName: values.authorName,
      status: values.status,
    };

    const res = await fetch(mode === "create" ? "/api/blog" : `/api/blog/${values.slug}`, {
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

    router.push("/admin/blog");
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
          <Label htmlFor="slug">Slug</Label>
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
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" required rows={2} value={values.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content">Content</Label>
        <RichTextEditor id="content" value={values.content} onChange={(v) => set("content", v)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={values.category} onValueChange={(v) => set("category", v as BlogFormValues["category"])}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v as BlogFormValues["status"])}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="authorName">Author name</Label>
          <Input
            id="authorName"
            required
            value={values.authorName}
            onChange={(e) => set("authorName", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coverColor">Cover colour (hex)</Label>
          <Input id="coverColor" value={values.coverColor} onChange={(e) => set("coverColor", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" value={values.tags} onChange={(e) => set("tags", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
