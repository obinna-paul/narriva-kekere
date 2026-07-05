"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface DraftStory {
  id: string;
  title: string;
  hookLine: string | null;
  status: string;
  wordCount: number;
}

export interface CompetitionApplyProps {
  competitionId: string;
  competitionSlug: string;
  wordCountLimit: number;
}

export function CompetitionApply({ competitionId, competitionSlug, wordCountLimit }: CompetitionApplyProps) {
  const [entered, setEntered] = useState(false);

  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftStory[] | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function openDraftPicker() {
    setDraftsOpen(true);
    setDraftError(null);
    if (drafts) return;
    try {
      const res = await fetch("/api/kekere/stories/mine");
      const { stories } = await res.json();
      setDrafts((stories as DraftStory[]).filter((s) => s.status === "DRAFT"));
    } catch {
      setDrafts([]);
      setDraftError("Couldn't load your drafts. Try again.");
    }
  }

  async function submitDraft() {
    if (!selectedDraftId) return;
    setDraftSubmitting(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/kekere/competitions/${competitionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: selectedDraftId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftError(body.error ?? "Couldn't submit that story. Try again.");
        return;
      }
      setDraftsOpen(false);
      setEntered(true);
    } finally {
      setDraftSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
    if (file && !file.name.toLowerCase().endsWith(".docx")) {
      setUploadFile(null);
      setUploadError("Only Word documents (.docx) are accepted — no PDFs.");
      return;
    }
    setUploadFile(file);
  }

  async function submitUpload() {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());

      const res = await fetch(`/api/kekere/competitions/${competitionId}/submit-upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(body.error ?? "Couldn't submit that document. Try again.");
        return;
      }
      setUploadOpen(false);
      setEntered(true);
    } finally {
      setUploading(false);
    }
  }

  if (entered) {
    return (
      <div className="rounded-xl bg-[rgba(31,111,74,0.1)] px-4 py-[17px] text-center text-[14px] font-medium text-[var(--color-success)]">
        You&apos;re entered! We&apos;ll be in touch if your story is shortlisted.{" "}
        <Link href={`/kekere/write?competition=${competitionSlug}`} className="underline">
          View your stories →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={openDraftPicker}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-sand-accent)] bg-transparent px-4 py-[15px] text-[15px] font-semibold text-[var(--color-sand-accent)] transition-colors hover:bg-[rgba(233,201,163,0.08)]"
        >
          <FileText size={16} />
          Select from draft
        </button>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
        >
          <Upload size={16} />
          Upload story
        </button>
      </div>

      {/* Select from draft — mobile drawer */}
      <Sheet open={draftsOpen} onOpenChange={setDraftsOpen}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col gap-0 p-0">
          <div className="flex-none border-b border-[rgba(42,26,18,.10)] px-5 py-4">
            <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">
              Select a draft to enter
            </span>
            <p className="mt-1 text-[13px] text-[rgba(42,26,18,.55)]">
              Only one story can be entered per writer.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {drafts === null && (
              <p className="py-8 text-center text-[13.5px] text-[rgba(42,26,18,.5)]">Loading your drafts…</p>
            )}
            {drafts?.length === 0 && (
              <p className="py-8 text-center text-[13.5px] text-[rgba(42,26,18,.5)]">
                No drafts yet — write a story first, or upload one instead.
              </p>
            )}
            {drafts?.map((story) => {
              const overLimit = story.wordCount > wordCountLimit;
              const selected = selectedDraftId === story.id;
              return (
                <button
                  key={story.id}
                  type="button"
                  disabled={overLimit}
                  onClick={() => setSelectedDraftId(story.id)}
                  className={cn(
                    "mb-2 flex w-full flex-col rounded-[11px] border px-4 py-3 text-left transition-colors disabled:opacity-50",
                    selected
                      ? "border-[var(--color-primary)] bg-[rgba(199,93,44,0.06)]"
                      : "border-[rgba(42,26,18,.08)] bg-white"
                  )}
                >
                  <span className="text-[14.5px] font-semibold text-[#2A1A12]">
                    {story.title || "Untitled story"}
                  </span>
                  <span className="mt-0.5 text-[12.5px] text-[rgba(42,26,18,.5)]">
                    {story.wordCount.toLocaleString()} words
                    {overLimit && ` — over the ${wordCountLimit.toLocaleString()}-word limit`}
                  </span>
                </button>
              );
            })}
          </div>

          {draftError && (
            <p className="flex-none px-5 pb-2 text-center text-[13px] text-red-600">{draftError}</p>
          )}

          <div className="flex-none border-t border-[rgba(42,26,18,.10)] px-5 py-4">
            <button
              type="button"
              disabled={!selectedDraftId || draftSubmitting}
              onClick={submitDraft}
              className="w-full rounded-[10px] bg-[var(--color-primary)] py-3 text-[14.5px] font-semibold text-white disabled:opacity-50"
            >
              {draftSubmitting ? "Submitting…" : "Submit this story"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload story */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload your story</DialogTitle>
            <DialogDescription>
              Word documents (.docx) only — no PDFs. Max {wordCountLimit.toLocaleString()} words.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="upload-title" className="text-sm font-medium text-[var(--color-ink)]">
                Title
              </label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Give your story a title…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="upload-file" className="text-sm font-medium text-[var(--color-ink)]">
                Manuscript (.docx)
              </label>
              <input
                id="upload-file"
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="text-sm text-[var(--color-ink)]/70 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </div>

            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </div>

          <DialogFooter>
            <Button
              onClick={submitUpload}
              disabled={!uploadFile || !uploadTitle.trim() || uploading}
              className={cn(buttonVariants({ variant: "primary" }))}
            >
              {uploading ? "Submitting…" : "Submit story"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
