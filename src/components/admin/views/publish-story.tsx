"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TagPicker } from "@/components/admin/TagPicker";
import { cn } from "@/lib/utils/cn";

const GENRES = [
  "Romance", "Thriller", "Mystery", "Literary Fiction", "Crime",
  "Horror", "Comedy", "Drama", "Speculative Fiction", "Satire", "Other",
];

const TIERS = [
  { value: "STANDARD", label: "Standard" },
  { value: "FEATURED", label: "Featured" },
  { value: "PREMIUM", label: "Premium" },
];

interface Writer {
  id: string;
  name: string;
  email: string;
}

function WriterSearch({ value, onChange }: { value: Writer | null; onChange: (w: Writer | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Writer[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&pageSize=8`);
      const d = await res.json();
      setResults((d.users ?? []).map((u: { id: string; name: string; email: string }) => ({
        id: u.id, name: u.name, email: u.email,
      })));
    } catch { setResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-white px-3 py-2.5">
        <div>
          <p className="text-[13px] font-semibold text-[#1A1C20]">{value.name}</p>
          <p className="text-[11px] text-[#8B919A]">{value.email}</p>
        </div>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(""); }}
          className="text-[11px] font-semibold text-[#C0392B] hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name or email…"
        className="w-full rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:border-[#1A1C20]/30 focus:bg-white focus:outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-[8px] border border-[rgba(20,22,26,0.1)] bg-white shadow-[0_8px_24px_-8px_rgba(20,22,26,0.25)]">
          {results.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => { onChange(w); setOpen(false); }}
              className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-[rgba(20,22,26,0.04)]"
            >
              <span className="text-[13px] font-semibold text-[#1A1C20]">{w.name}</span>
              <span className="text-[11px] text-[#8B919A]">{w.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CoverUpload({
  coverImageRef,
  previewUrl,
  storyId,
  onUploaded,
}: {
  coverImageRef: string | null;
  previewUrl: string | null;
  storyId: string;
  onUploaded: (ref: string, preview: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setUploading(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("storyId", storyId);
    try {
      const res = await fetch("/api/admin/kekere/cover-upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      onUploaded(d.coverImageRef, d.previewUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed transition-colors",
          previewUrl
            ? "h-[160px] border-transparent p-0"
            : "h-[160px] border-[rgba(20,22,26,0.2)] bg-[#F4F5F7] hover:border-[rgba(20,22,26,0.4)]",
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Cover preview" className="h-full w-full rounded-[10px] object-cover" />
            <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-[rgba(0,0,0,0.4)] opacity-0 transition-opacity hover:opacity-100">
              <span className="text-[13px] font-semibold text-white">Replace</span>
            </div>
          </>
        ) : uploading ? (
          <p className="text-[13px] text-[#8B919A]">Uploading…</p>
        ) : (
          <>
            <span className="text-[28px]">🖼</span>
            <p className="mt-2 text-[12px] font-semibold text-[#646B73]">Click or drag to upload cover</p>
            <p className="text-[11px] text-[#9AA0A8]">JPG, PNG, WEBP recommended</p>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#C0392B]">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
      {children}
      {hint && <span className="ml-1 normal-case font-normal text-[#9AA0A8]">{hint}</span>}
    </label>
  );
}

function Field({ children, label, hint }: { children: React.ReactNode; label: string; hint?: string }) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {children}
    </div>
  );
}

const INPUT = "w-full rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:border-[#1A1C20]/30 focus:bg-white focus:outline-none";

// Generate a stable temp ID for Cloudinary uploads before story is created
function genId(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

type Step = "form" | "sent";

export function PublishStory() {
  const [tempStoryId] = useState(genId);
  const [writer, setWriter] = useState<Writer | null>(null);
  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [genre, setGenre] = useState("Literary Fiction");
  const [cowrieCost, setCowrieCost] = useState(3);
  const [tier, setTier] = useState("STANDARD");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [sentTo, setSentTo] = useState<{ writerName: string; storyTitle: string } | null>(null);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const estReadMins = Math.max(1, Math.round(wordCount / 200));

  const tagError = tagIds.length === 0;
  const canSubmit = !!writer && title.trim() && hookLine.trim() && body.trim() && tagIds.length > 0 && tagIds.length <= 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!writer || !canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/kekere/stories/publish-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writerId: writer.id,
          title: title.trim(),
          hookLine: hookLine.trim(),
          genre: genre.trim(),
          cowrieCost,
          tier,
          readingTime: estReadMins,
          body: body.trim(),
          tags: tagIds,
          coverImageRef: coverImageRef ?? undefined,
          expiresInDays,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create contract");

      setSentTo({ writerName: writer.name, storyTitle: title });
      setStep("sent");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setWriter(null);
    setTitle(""); setHookLine(""); setBody("");
    setGenre("Literary Fiction"); setCowrieCost(3); setTier("STANDARD");
    setTagIds([]); setCoverImageRef(null); setCoverPreviewUrl(null);
    setExpiresInDays(14); setError(null);
    setStep("form"); setSentTo(null);
  }

  if (step === "sent" && sentTo) {
    return (
      <div className="mx-auto max-w-[480px] rounded-[14px] border border-[#1F8A5B]/30 bg-[rgba(31,138,91,0.06)] p-8 text-center">
        <div className="text-[40px]">✍️</div>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold text-[#1A1C20]">
          Contract sent
        </h2>
        <p className="mt-3 text-[14px] leading-[1.6] text-[#646B73]">
          <strong>{sentTo.writerName}</strong> has been notified in-app and by email. Once they sign, <em>{sentTo.storyTitle}</em> will go live immediately.
        </p>
        <p className="mt-2 text-[12px] text-[#9AA0A8]">Contract expires in {expiresInDays} days.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-[8px] bg-[#1A1C20] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2A2D33]"
        >
          Publish another story
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[780px] space-y-6">
      {/* ── Header ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#1A1C20]">Publish a story directly</h2>
        <p className="mt-1 text-[12px] text-[#8B919A]">
          Creates the story, generates the publishing contract, and sends it to the writer.
          The story goes live the moment they sign.
        </p>
      </div>

      {/* ── Writer ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#646B73]">Writer</h3>
        <Field label="Select writer">
          <WriterSearch value={writer} onChange={setWriter} />
        </Field>
      </div>

      {/* ── Story details ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#646B73]">Story details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Title">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Story title"
                required
                className={INPUT}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Hook line" hint="(the one-sentence teaser shown in the feed)">
              <input
                type="text"
                value={hookLine}
                onChange={(e) => setHookLine(e.target.value)}
                placeholder="A single sentence that makes readers want to open it"
                required
                className={INPUT}
              />
            </Field>
          </div>
          <Field label="Genre">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className={INPUT}
            >
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Tier">
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={INPUT}>
              {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <FieldLabel hint="(reader pays this many cowries to unlock)">Cowrie cost</FieldLabel>
          <div className="flex items-center gap-4">
            <input
              type="range" min={1} max={10} step={1} value={cowrieCost}
              onChange={(e) => setCowrieCost(Number(e.target.value))}
              className="flex-1 accent-[#C75D2C]"
            />
            <span className="w-8 text-center text-[16px] font-bold text-[#C75D2C]">{cowrieCost}</span>
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel hint="(max 2)">Feed placement tags</FieldLabel>
          <TagPicker
            value={tagIds}
            onChange={(ids) => setTagIds(ids.slice(0, 2))}
            error={tagError}
          />
          {tagIds.length === 2 && (
            <p className="mt-1 text-[10px] text-[#8B919A]">2 tags selected — maximum reached.</p>
          )}
          {tagError && <p className="mt-1 text-[10px] text-[#C0392B]">Select at least one tag.</p>}
        </div>
      </div>

      {/* ── Cover ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#646B73]">Cover image</h3>
        <div className="flex gap-5">
          <div className="w-[160px] flex-none">
            <CoverUpload
              coverImageRef={coverImageRef}
              previewUrl={coverPreviewUrl}
              storyId={tempStoryId}
              onUploaded={(ref, preview) => { setCoverImageRef(ref); setCoverPreviewUrl(preview); }}
            />
          </div>
          <div className="flex flex-1 items-center text-[12px] leading-[1.65] text-[#8B919A]">
            <p>
              Upload the story cover (JPG or PNG, portrait ratio recommended).
              If omitted, Kekere will display a colour-gradient placeholder until a cover is added later.
            </p>
          </div>
        </div>
      </div>

      {/* ── Story body ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#646B73]">Story body</h3>
          <span className="text-[11px] text-[#9AA0A8]">
            {wordCount.toLocaleString()} words · ~{estReadMins} min read
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={22}
          required
          placeholder={"Paste or type the story here. Use blank lines between paragraphs.\n\nThe admin can edit the text freely before sending the contract."}
          className="w-full resize-y rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 font-mono text-[12.5px] leading-[1.7] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:border-[#1A1C20]/30 focus:bg-white focus:outline-none"
        />
        <p className="mt-1.5 text-[11px] text-[#9AA0A8]">
          Plain text only — blank lines become paragraph breaks. You can edit this as much as needed before sending the contract.
        </p>
      </div>

      {/* ── Contract ── */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#646B73]">Contract</h3>
        <Field label="Offer expires in (days)" hint="(writer must sign within this window)">
          <input
            type="number"
            min={3}
            max={60}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className={cn(INPUT, "w-[120px]")}
          />
        </Field>
        <div className="mt-4 rounded-[8px] bg-[#F4F5F7] p-4 text-[11.5px] leading-[1.65] text-[#646B73]">
          <p className="mb-2 font-semibold text-[#1A1C20]">What happens when you click &quot;Send contract&quot;</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Story is created as <em>Pending Contract</em> (not yet live).</li>
            <li>A publishing contract is generated using the Kekere Stories Publishing Agreement template (70% writer / 30% platform).</li>
            <li>The writer receives an in-app notification with a one-tap &quot;I accept&quot; button.</li>
            <li>The writer also receives an email with the contract PDF attached.</li>
            <li>The moment the writer signs, the story goes live and readers can unlock it.</li>
          </ol>
        </div>
      </div>

      {error && (
        <div className="rounded-[8px] border border-[#C0392B]/25 bg-[rgba(192,57,43,0.06)] px-4 py-3 text-[13px] text-[#C0392B]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pb-10">
        <p className="text-[12px] text-[#8B919A]">
          {canSubmit ? "Ready to send." : "Fill in all required fields before sending."}
        </p>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-[8px] bg-[#1F8A5B] px-7 py-3 text-[14px] font-semibold text-white transition-opacity hover:bg-[#1a7a50] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send contract to writer"}
        </button>
      </div>
    </form>
  );
}
