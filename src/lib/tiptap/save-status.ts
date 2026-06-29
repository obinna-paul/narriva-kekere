export type SaveStatus =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; lastSavedAt: string }
  | { kind: "offline" }
  | { kind: "conflict" };

export function draftStorageKey(storyId: string): string {
  return `kekere_draft_${storyId}`;
}

export function draftSavedAtStorageKey(storyId: string): string {
  return `kekere_draft_${storyId}_savedAt`;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}
