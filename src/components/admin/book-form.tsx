"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EbookStats {
  ebookRef: string;
  chapterCount: number;
  wordCount: number;
  estimatedReadTime: number;
}

function EbookUploadField({
  bookId,
  ebookRef,
  chapterCount,
  wordCount,
  estimatedReadTime,
  onUploaded,
}: {
  bookId: string;
  ebookRef: string;
  chapterCount: string;
  wordCount: string;
  estimatedReadTime: string;
  onUploaded: (stats: EbookStats) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch(`/api/admin/books/${bookId}/ebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }

      onUploaded(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't parse or upload that file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-ink)]/10 p-4">
      <Label htmlFor="ebookFile">Ebook content (JSON)</Label>
      <input
        id="ebookFile"
        type="file"
        accept="application/json"
        onChange={handleFile}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="text-sm text-[var(--color-ink)]/60">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {ebookRef && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-ink)]/70">
          <span>
            {chapterCount} chapters · {Number(wordCount).toLocaleString()} words · ~{estimatedReadTime} min
          </span>
          <Link
            href={`/read/${bookId}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Preview in reader
          </Link>
        </div>
      )}
    </div>
  );
}

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

      {mode === "edit" && bookId ? (
        <EbookUploadField
          bookId={bookId}
          ebookRef={values.ebookRef}
          chapterCount={values.chapterCount}
          wordCount={values.wordCount}
          estimatedReadTime={values.estimatedReadTime}
          onUploaded={(stats) => {
            set("ebookRef", stats.ebookRef);
            set("chapterCount", String(stats.chapterCount));
            set("wordCount", String(stats.wordCount));
            set("estimatedReadTime", String(stats.estimatedReadTime));
          }}
        />
      ) : (
        <p className="rounded-lg bg-[var(--color-ink)]/[0.04] p-4 text-sm text-[var(--color-ink)]/60">
          Save this book first, then come back to its edit page to upload the ebook content.
        </p>
      )}

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
