"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BookFormAuthor {
  id: string;
  name: string;
}

export interface BookFormValues {
  slug: string;
  title: string;
  authorId: string;
  genre: string;
  hookLine: string;
  synopsis: string;
  excerpt: string;
  coverColor: string;
  ebookRef: string;
  chapterCount: string;
  wordCount: string;
  estimatedReadTime: string;
  price: string;
  editorNote: string;
  editorNoteAttribution: string;
  featured: boolean;
  isNewRelease: boolean;
  publishedAt: string;
}

const EMPTY: BookFormValues = {
  slug: "",
  title: "",
  authorId: "",
  genre: "",
  hookLine: "",
  synopsis: "",
  excerpt: "",
  coverColor: "#1E3A8A",
  ebookRef: "",
  chapterCount: "0",
  wordCount: "0",
  estimatedReadTime: "0",
  price: "",
  editorNote: "",
  editorNoteAttribution: "",
  featured: false,
  isNewRelease: false,
  publishedAt: new Date().toISOString().slice(0, 10),
};

export interface BookFormProps {
  mode: "create" | "edit";
  bookId?: string;
  authors: BookFormAuthor[];
  initial?: Partial<BookFormValues>;
}

export function BookForm({ mode, bookId, authors, initial }: BookFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BookFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof BookFormValues>(key: K, value: BookFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug: values.slug,
      title: values.title,
      authorId: values.authorId,
      genre: values.genre,
      hookLine: values.hookLine,
      synopsis: values.synopsis,
      excerpt: values.excerpt.split("\n\n").map((p) => p.trim()).filter(Boolean),
      coverImageRef: values.coverColor,
      ebookRef: values.ebookRef,
      chapterCount: Number(values.chapterCount),
      wordCount: Number(values.wordCount),
      estimatedReadTime: Number(values.estimatedReadTime),
      price: Number(values.price),
      editorNote: values.editorNote || undefined,
      editorNoteAttribution: values.editorNoteAttribution || undefined,
      featured: values.featured,
      isNewRelease: values.isNewRelease,
      publishedAt: values.publishedAt,
    };

    const res = await fetch(mode === "create" ? "/api/books" : `/api/books/${bookId}`, {
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

    router.push("/admin/books");
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
        <Label htmlFor="authorId">Author</Label>
        <Select value={values.authorId} onValueChange={(v) => set("authorId", v)}>
          <SelectTrigger id="authorId">
            <SelectValue placeholder="Select an author" />
          </SelectTrigger>
          <SelectContent>
            {authors.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="genre">Genre</Label>
          <Input id="genre" required value={values.genre} onChange={(e) => set("genre", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price (NGN)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            required
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hookLine">Hook line</Label>
        <Input id="hookLine" required value={values.hookLine} onChange={(e) => set("hookLine", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="synopsis">Synopsis</Label>
        <Textarea id="synopsis" required rows={3} value={values.synopsis} onChange={(e) => set("synopsis", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Excerpt (separate paragraphs with a blank line)</Label>
        <Textarea id="excerpt" rows={6} value={values.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coverColor">Cover colour (hex)</Label>
          <Input id="coverColor" value={values.coverColor} onChange={(e) => set("coverColor", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publishedAt">Published date</Label>
          <Input
            id="publishedAt"
            type="date"
            required
            value={values.publishedAt}
            onChange={(e) => set("publishedAt", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ebookRef">Ebook R2 path</Label>
          <Input id="ebookRef" required value={values.ebookRef} onChange={(e) => set("ebookRef", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chapterCount">Chapter count</Label>
          <Input id="chapterCount" type="number" min="0" required value={values.chapterCount} onChange={(e) => set("chapterCount", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wordCount">Word count</Label>
          <Input id="wordCount" type="number" min="0" required value={values.wordCount} onChange={(e) => set("wordCount", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedReadTime">Est. read time (minutes)</Label>
          <Input id="estimatedReadTime" type="number" min="0" required value={values.estimatedReadTime} onChange={(e) => set("estimatedReadTime", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="editorNote">Editor&apos;s note</Label>
          <Textarea id="editorNote" rows={3} value={values.editorNote} onChange={(e) => set("editorNote", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="editorNoteAttribution">Editor&apos;s note attribution</Label>
          <Input
            id="editorNoteAttribution"
            value={values.editorNoteAttribution}
            onChange={(e) => set("editorNoteAttribution", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="featured" checked={values.featured} onCheckedChange={(c) => set("featured", c === true)} />
          <Label htmlFor="featured" className="font-normal tracking-normal">
            Featured on homepage
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="isNewRelease"
            checked={values.isNewRelease}
            onCheckedChange={(c) => set("isNewRelease", c === true)}
          />
          <Label htmlFor="isNewRelease" className="font-normal tracking-normal">
            New release
          </Label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create book" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
