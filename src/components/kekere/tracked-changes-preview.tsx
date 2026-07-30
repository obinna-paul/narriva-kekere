"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { docParagraphsToHtml, type TiptapDoc, type TiptapParagraphNode } from "@/lib/tiptap/doc-utils";
import { diffParagraphWords, type DiffSpan } from "@/lib/tiptap/paragraph-diff";

/**
 * Read-only word-level tracked changes between two versions of a story
 * body — the same rendering the writer's review screen uses, so what the
 * editor previews here is exactly what the writer will see once these
 * edits are sent. Used by the admin "Tracked changes" toggle in the To Be
 * Published queue, to check a change set before sending it.
 */

type ParaKind = "unchanged" | "changed" | "added" | "removed";

interface Unit {
  id: string;
  kind: ParaKind;
  newHtml?: string;
  oldHtml?: string;
  spans?: DiffSpan[] | null;
  textAlign?: "left" | "center" | "right";
}

function renderSpansToHtml(spans: DiffSpan[]): string {
  return spans
    .map((s) => {
      if (s.kind === "equal") return s.html;
      if (s.kind === "removed") {
        return `<span style="text-decoration:line-through;text-decoration-color:#A13A3A;color:#A13A3A;background:rgba(193,58,58,0.12);border-radius:3px;">${s.html}</span>`;
      }
      return `<span style="text-decoration:underline;text-decoration-color:#1F8A5B;color:#1F8A5B;background:rgba(31,138,91,0.14);border-radius:3px;">${s.html}</span>`;
    })
    .join("");
}

export function TrackedChangesPreview({ original, edited }: { original: TiptapDoc; edited: TiptapDoc }) {
  const units = useMemo<Unit[]>(() => {
    const editedParas = docParagraphsToHtml(edited);
    const originalParas = docParagraphsToHtml(original);
    const origHtmlById = new Map(originalParas.map((p) => [p.id, p.html]));
    const editedIds = new Set(editedParas.map((p) => p.id));
    const origNodeById = new Map<string, TiptapParagraphNode>();
    for (const n of original.content ?? []) if (n.attrs?.id) origNodeById.set(n.attrs.id, n);
    const editedNodeById = new Map<string, TiptapParagraphNode>();
    for (const n of edited.content ?? []) if (n.attrs?.id) editedNodeById.set(n.attrs.id, n);

    const list: Unit[] = [];
    for (const p of editedParas) {
      const kind: ParaKind = !p.id || !origHtmlById.has(p.id) ? "added" : origHtmlById.get(p.id) !== p.html ? "changed" : "unchanged";
      const spans = kind === "changed" && p.id ? diffParagraphWords(origNodeById.get(p.id), editedNodeById.get(p.id)) : undefined;
      list.push({ id: p.id, kind, newHtml: p.html, oldHtml: p.id ? origHtmlById.get(p.id) : undefined, spans, textAlign: p.textAlign });
    }
    originalParas.forEach((p, i) => {
      if (!p.id || editedIds.has(p.id) || !p.html.trim()) return;
      let insertAt = list.length;
      for (let j = i - 1; j >= 0; j--) {
        const idx = list.findIndex((u) => u.id === originalParas[j].id);
        if (idx >= 0) { insertAt = idx + 1; break; }
      }
      list.splice(insertAt, 0, { id: p.id, kind: "removed", oldHtml: p.html });
    });
    return list;
  }, [original, edited]);

  const changeCount = units.filter((u) => u.kind !== "unchanged").length;

  if (changeCount === 0) {
    return <p className="text-[13px] text-[#9AA0A8]">No changes from the writer&apos;s original yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
        {changeCount} change{changeCount === 1 ? "" : "s"} from the writer&apos;s original — this is what they&apos;ll see
      </p>
      {units.map((u, i) => {
        if (u.kind === "unchanged") {
          return (
            <p key={u.id || i} className="text-[15px] leading-[1.75] text-[#1A1C20]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "" }} />
          );
        }
        return (
          <div key={u.id || i} className="overflow-hidden rounded-[10px] border border-[rgba(20,22,26,0.08)]">
            <div className="flex items-center gap-1.5 border-b border-[rgba(20,22,26,0.06)] bg-[rgba(20,22,26,0.02)] px-3 py-1.5">
              <AlertCircle size={10} className={cn(
                u.kind === "added" ? "text-[#1F8A5B]" : u.kind === "removed" ? "text-[#A13A3A]" : "text-[#C75D2C]",
              )} />
              <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#9AA0A8]">
                {u.kind === "added" ? "New paragraph" : u.kind === "removed" ? "Removed" : "Edited"}
              </span>
            </div>
            <div className="p-3">
              {u.kind === "changed" && u.spans && (
                <p className="text-[14.5px] leading-[1.7] text-[#1A1C20]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: renderSpansToHtml(u.spans) }} />
              )}
              {u.kind === "changed" && !u.spans && (
                <>
                  <p className="mb-2 text-[14.5px] leading-[1.7] text-[#A13A3A] line-through" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} />
                  <p className="text-[14.5px] leading-[1.7] text-[#1F8A5B]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "" }} />
                </>
              )}
              {u.kind === "added" && (
                <p className="text-[14.5px] leading-[1.7] text-[#1F8A5B]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "" }} />
              )}
              {u.kind === "removed" && (
                <p className="text-[14.5px] leading-[1.7] text-[#A13A3A] line-through" dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
