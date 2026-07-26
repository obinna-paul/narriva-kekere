"use client";

import { useEffect, useState } from "react";

export interface PendingSelection {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  rect: DOMRect;
}

const DEBOUNCE_MS = 150;

/** Character offset of (container, offset) relative to root's full text —
 * works whether container is a text node or an element node, by letting the
 * browser's own Range serialization do the counting instead of manually
 * walking text nodes. Same offset scheme paragraphPlainText() (doc-utils.ts)
 * defines server-side, so client-computed offsets line up with how the
 * server re-validates and how decorations later re-resolve them. */
function textOffsetInElement(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

function closestParagraph(node: Node): HTMLElement | null {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
  return el?.closest<HTMLElement>("[data-paragraph-id]") ?? null;
}

/**
 * Watches for a non-collapsed text selection inside `containerRef` while
 * `active` is true, and reports it as a single-paragraph character-offset
 * span — the same scheme highlights are persisted with.
 *
 * A selection is deliberately clamped to a single paragraph: if it starts in
 * one paragraph and continues into another, the end offset is clamped to
 * the end of the first paragraph's text rather than trying to represent a
 * cross-paragraph highlight. Nothing in the feature request needs spanning
 * multiple paragraphs ("a sentence, line, or word"), and supporting it would
 * add real complexity — a different paragraphId per span, at minimum — for
 * a case nobody asked for.
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement>, active: boolean) {
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);

  useEffect(() => {
    if (!active) {
      setPendingSelection(null);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    function evaluate() {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPendingSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setPendingSelection(null);
        return;
      }

      const startEl = closestParagraph(range.startContainer);
      const paragraphId = startEl?.dataset.paragraphId;
      if (!startEl || !paragraphId) {
        setPendingSelection(null);
        return;
      }

      const startOffset = textOffsetInElement(startEl, range.startContainer, range.startOffset);
      const endEl = closestParagraph(range.endContainer);
      const paragraphTextLength = startEl.textContent?.length ?? 0;
      const endOffset =
        endEl === startEl ? textOffsetInElement(startEl, range.endContainer, range.endOffset) : paragraphTextLength;

      if (endOffset <= startOffset) {
        setPendingSelection(null);
        return;
      }

      const text = (startEl.textContent ?? "").slice(startOffset, endOffset);
      setPendingSelection({ paragraphId, startOffset, endOffset, text, rect: range.getBoundingClientRect() });
    }

    function onSelectionChange() {
      clearTimeout(timer);
      timer = setTimeout(evaluate, DEBOUNCE_MS);
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [containerRef, active]);

  function clearPendingSelection() {
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  return { pendingSelection, clearPendingSelection };
}
