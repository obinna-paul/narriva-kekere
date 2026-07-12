"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AmbientSound {
  id: string;
  title: string;
  order: number;
  active: boolean;
  createdAt: string;
}

export function AmbientSoundsView() {
  const [sounds, setSounds] = useState<AmbientSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/kekere/ambient-sounds")
      .then((r) => r.json())
      .then((d) => setSounds(d.sounds ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!title.trim() || !file) {
      setUploadError("Give it a title and pick an audio file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    let soundId: string | undefined;
    try {
      // Step 1 — ask our server for a presigned R2 upload URL. Only tiny JSON
      // crosses to our server here, so the platform's request-body limit
      // (which rejects a full audio file before our code runs) never applies.
      const mintRes = await fetch("/api/admin/kekere/ambient-sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), filename: file.name, contentType: file.type, size: file.size }),
      });
      const mintData = await mintRes.json().catch(() => ({}));
      if (!mintRes.ok) {
        throw new Error(mintData.error ?? `Could not start upload (HTTP ${mintRes.status})`);
      }
      soundId = mintData.soundId;

      // Step 2 — PUT the file straight to R2.
      const putRes = await fetch(mintData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mintData.contentType },
        body: file,
      });
      if (!putRes.ok) {
        const hint = mintData.corsWarning
          ? " Your R2 bucket may be blocking browser uploads (CORS) — the storage token couldn't set it automatically."
          : "";
        throw new Error(`Storage rejected the file (HTTP ${putRes.status}).${hint}`);
      }

      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      // "Failed to fetch" on the PUT is almost always the R2 bucket blocking
      // the cross-origin request (CORS) — translate it into something useful.
      const raw = e instanceof Error ? e.message : "Upload failed";
      const msg = /failed to fetch/i.test(raw) && soundId
        ? "The browser couldn't reach storage (likely an R2 CORS block). Check the bucket's CORS policy allows PUT."
        : raw;
      setUploadError(msg);
      if (soundId) {
        // Clean up the row if the file never landed.
        fetch(`/api/admin/kekere/ambient-sounds/${soundId}`, { method: "DELETE" }).catch(() => {});
      }
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(sound: AmbientSound) {
    setBusyId(sound.id);
    try {
      await fetch(`/api/admin/kekere/ambient-sounds/${sound.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !sound.active }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function move(sound: AmbientSound, direction: -1 | 1) {
    const sorted = [...sounds].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === sound.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;

    setBusyId(sound.id);
    try {
      await Promise.all([
        fetch(`/api/admin/kekere/ambient-sounds/${sound.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: swapWith.order }),
        }),
        fetch(`/api/admin/kekere/ambient-sounds/${swapWith.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: sound.order }),
        }),
      ]);
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(sound: AmbientSound) {
    if (!window.confirm(`Remove "${sound.title}" from the library? This can't be undone.`)) return;
    setBusyId(sound.id);
    try {
      await fetch(`/api/admin/kekere/ambient-sounds/${sound.id}`, { method: "DELETE" });
      load();
    } finally {
      setBusyId(null);
    }
  }

  const sorted = [...sounds].sort((a, b) => a.order - b.order);

  return (
    <div className="px-[34px] py-[30px] max-w-[900px] space-y-7">
      <div>
        <h2 className="text-[18px] font-semibold text-[#1A1C20]">Ambient sounds</h2>
        <p className="mt-1 text-[13px] text-[#8B919A]">
          The white-noise library readers pick from via the headphone icon in the story reader.
          Only active tracks show up there — upload a track here, or toggle one off without deleting it.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5 space-y-3"
      >
        <h3 className="text-[13px] font-semibold text-[#1A1C20]">Add a track</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Rainfall, Cafe hum, Forest morning"
            className="flex-1 rounded-[8px] border border-[rgba(20,22,26,0.12)] px-3 py-2 text-[13px] text-[#1A1C20] outline-none focus:border-[#C75D2C]"
          />
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.mp4"
            className="flex-1 text-[12px] text-[#646B73]"
          />
          <button
            type="submit"
            disabled={uploading}
            className="flex-none rounded-[8px] bg-[#C75D2C] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#a94e24] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadError && <p className="text-[12px] text-[#C0392B]">{uploadError}</p>}
      </form>

      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
        <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Library ({sorted.length})</h3>
        {loading ? (
          <p className="text-[13px] text-[#8B919A]">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-[13px] text-[#8B919A]">No tracks yet — add one above.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((sound, i) => (
              <div key={sound.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(sound, -1)}
                      disabled={i === 0 || busyId === sound.id}
                      aria-label="Move up"
                      className="text-[10px] leading-none text-[#8B919A] hover:text-[#1A1C20] disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => move(sound, 1)}
                      disabled={i === sorted.length - 1 || busyId === sound.id}
                      aria-label="Move down"
                      className="text-[10px] leading-none text-[#8B919A] hover:text-[#1A1C20] disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="text-[13px] font-medium text-[#1A1C20]">{sound.title}</div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => remove(sound)}
                    disabled={busyId === sound.id}
                    className="text-[12px] font-medium text-[#C0392B] hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(sound)}
                    disabled={busyId === sound.id}
                    aria-label={sound.active ? "Deactivate" : "Activate"}
                    className={`h-[20px] w-[36px] rounded-full relative transition-colors ${sound.active ? "bg-[#1F8A5B]" : "bg-[rgba(20,22,26,0.15)]"}`}
                  >
                    <div className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all ${sound.active ? "left-[18px]" : "left-[2px]"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
