"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface TagOption {
  id: string;
  slug: string;
  label: string;
}

interface TagPickerProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  error?: boolean;
}

export function TagPicker({ value, onChange, error }: TagPickerProps) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/kekere/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  const filtered = tags.filter((t) =>
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((t) => value.includes(t.id));

  return (
    <div ref={dropRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          "min-h-[38px] cursor-pointer rounded-[8px] border px-3 py-2 text-[12px]",
          error
            ? "border-[#C0392B]/50 bg-[rgba(192,57,43,0.04)]"
            : open
            ? "border-[#1A1C20]/30 bg-white"
            : "border-[rgba(20,22,26,0.14)] bg-[#F4F5F7]",
          "flex flex-wrap gap-1 items-center"
        )}
      >
        {selectedTags.length === 0 ? (
          <span className="text-[#9AA0A8]">Select tags…</span>
        ) : (
          selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#1A1C20] px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              {t.label}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                className="ml-0.5 text-[#9AA0A8] hover:text-white"
                aria-label={`Remove ${t.label}`}
              >
                ×
              </button>
            </span>
          ))
        )}
        <span className="ml-auto text-[10px] text-[#9AA0A8]">{open ? "▲" : "▾"}</span>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-[8px] border border-[rgba(20,22,26,0.1)] bg-white shadow-[0_8px_24px_-8px_rgba(20,22,26,0.25)]">
          <div className="border-b border-[rgba(20,22,26,0.08)] px-3 py-2">
            <input
              autoFocus
              type="text"
              placeholder="Search tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[12px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-[#9AA0A8]">No tags match</p>
            ) : (
              filtered.map((t) => {
                const selected = value.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[12px] font-medium transition-colors",
                      selected
                        ? "bg-[rgba(20,22,26,0.07)] text-[#1A1C20]"
                        : "text-[#4A5058] hover:bg-[rgba(20,22,26,0.04)]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-[14px] w-[14px] flex-none items-center justify-center rounded-[3px] border text-[9px] text-white",
                        selected
                          ? "border-[#1A1C20] bg-[#1A1C20]"
                          : "border-[rgba(20,22,26,0.25)] bg-transparent"
                      )}
                    >
                      {selected && "✓"}
                    </span>
                    {t.label}
                  </button>
                );
              })
            )}
          </div>
          {value.length > 0 && (
            <div className="border-t border-[rgba(20,22,26,0.08)] px-3 py-2 text-[10px] text-[#9AA0A8]">
              {value.length} tag{value.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
