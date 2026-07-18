"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Flag, UserX, PenLine, Inbox as InboxIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { NotePrompt, SentNote, InboxNote, BlockedSender } from "@/lib/data/kekere-notes";

const ERROR_MESSAGES: Record<string, string> = {
  profanity: "Please remove inappropriate language and try again.",
  too_long: "That's a bit long — keep it under 500 characters.",
  empty: "Write something before sending.",
  already_sent: "You've already sent a note for this story.",
  already_replied: "You've already replied to this note.",
};

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? "Something went wrong — try again.";
}

function formatDate(d: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}

function Avatar({ name, color }: { name: string; color: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[13px] font-semibold text-white"
      style={{ background: `linear-gradient(135deg, #E08A4A, ${color ?? "#C75D2C"})` }}
    >
      {initial}
    </span>
  );
}

function PromptRow({ prompt, onSent }: { prompt: NotePrompt; onSent: (storyId: string, body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/kekere/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: prompt.storyId, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data.error));
        return;
      }
      onSent(prompt.storyId, body);
    } catch {
      setError("Couldn't send your note — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={prompt.writerName} color={prompt.writerAvatarColor} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{prompt.writerName}</p>
          <p className="truncate text-[12px] text-[var(--color-ink-muted-2)]">You finished &ldquo;{prompt.storyTitle}&rdquo;</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-none items-center gap-1 rounded-full bg-[var(--color-primary-muted)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-primary-light)]"
        >
          <PenLine size={11} /> Write
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={`Tell ${prompt.writerName} what stuck with you…`}
            disabled={sending}
            className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.14)] px-3 py-2.5 text-[13.5px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-ink-muted-3)]">{body.length} / 500</span>
            <button
              type="button"
              onClick={send}
              disabled={sending || !body.trim()}
              className="flex items-center gap-1.5 rounded-[10px] bg-[var(--color-primary)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={12} /> {sending ? "Sending…" : "Send note"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-[#A13A3A]">{error}</p>}
        </div>
      )}
    </div>
  );
}

function SentNoteRow({ note }: { note: SentNote }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">
          To {note.writerName} &middot; <span className="font-normal text-[var(--color-ink-muted-2)]">{note.storyTitle}</span>
        </p>
        <span className="flex-none text-[11px] text-[var(--color-ink-muted-3)]">{formatDate(note.createdAt)}</span>
      </div>
      <p className="mt-2 text-[13.5px] leading-snug text-[var(--color-ink-muted)]">{note.body}</p>
      {note.replyBody && (
        <div className="mt-3 rounded-xl bg-[rgba(199,93,44,0.06)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            {note.writerName} replied
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink)]">{note.replyBody}</p>
        </div>
      )}
    </div>
  );
}

function InboxNoteRow({
  note,
  onReplied,
  onReported,
  onBlocked,
}: {
  note: InboxNote;
  onReplied: (id: string, body: string) => void;
  onReported: (id: string) => void;
  onBlocked: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(!note.read);
  const [marking, setMarking] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !note.read && !marking) {
      setMarking(true);
      fetch(`/api/kekere/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      }).catch(() => {}).finally(() => setMarking(false));
    }
  }

  async function sendReply() {
    setReplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/kekere/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", body: replyBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data.error));
        return;
      }
      onReplied(note.id, replyBody);
    } catch {
      setError("Couldn't send your reply — try again.");
    } finally {
      setReplying(false);
    }
  }

  async function report() {
    await fetch(`/api/kekere/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report" }),
    }).catch(() => {});
    onReported(note.id);
  }

  async function block() {
    await fetch("/api/kekere/notes/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: note.fromUserId }),
    }).catch(() => {});
    onBlocked(note.fromUserId);
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <button type="button" onClick={toggleExpand} className="flex w-full items-center gap-2.5 text-left">
        {!note.read && <span className="h-2 w-2 flex-none rounded-full bg-[var(--color-primary)]" />}
        <Avatar name={note.fromUserName} color={note.fromUserAvatarColor} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[13.5px]", note.read ? "font-medium" : "font-bold", "text-[var(--color-ink)]")}>
            {note.fromUserName}
          </p>
          <p className="truncate text-[12px] text-[var(--color-ink-muted-2)]">on &ldquo;{note.storyTitle}&rdquo;</p>
        </div>
        <span className="flex-none text-[11px] text-[var(--color-ink-muted-3)]">{formatDate(note.createdAt)}</span>
        <ChevronDown size={15} className={cn("flex-none text-[var(--color-ink-muted-3)] transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-3">
          <p className="text-[13.5px] leading-snug text-[var(--color-ink)]">{note.body}</p>

          {note.replyBody ? (
            <div className="mt-3 rounded-xl bg-[rgba(199,93,44,0.06)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">Your reply</p>
              <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink)]">{note.replyBody}</p>
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Reply once — make it count…"
                disabled={replying}
                className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.14)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-ink-muted-3)]">{replyBody.length} / 500</span>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={replying || !replyBody.trim()}
                  className="flex items-center gap-1.5 rounded-[10px] bg-[var(--color-primary)] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={11} /> {replying ? "Sending…" : "Reply"}
                </button>
              </div>
              {error && <p className="mt-2 text-[12px] text-[#A13A3A]">{error}</p>}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 border-t border-[var(--color-border)] pt-2.5">
            <button type="button" onClick={report} className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--color-ink-muted-2)] hover:text-[var(--color-ink)]">
              <Flag size={12} /> Report
            </button>
            {confirmBlock ? (
              <span className="flex items-center gap-2 text-[11.5px]">
                Block {note.fromUserName}?
                <button type="button" onClick={block} className="font-semibold text-[#A13A3A]">Yes</button>
                <button type="button" onClick={() => setConfirmBlock(false)} className="text-[var(--color-ink-muted-2)]">No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmBlock(true)} className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--color-ink-muted-2)] hover:text-[#A13A3A]">
                <UserX size={12} /> Block
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface NotesViewProps {
  isWriter: boolean;
  initialPrompts: NotePrompt[];
  initialSent: SentNote[];
  initialInbox: InboxNote[];
  initialBlockedSenders: BlockedSender[];
  initialNotesEnabled: boolean;
}

type Tab = "sent" | "inbox";

export function NotesView({
  isWriter,
  initialPrompts,
  initialSent,
  initialInbox,
  initialBlockedSenders,
  initialNotesEnabled,
}: NotesViewProps) {
  const [tab, setTab] = useState<Tab>("sent");
  const [prompts, setPrompts] = useState(initialPrompts);
  const [sent, setSent] = useState(initialSent);
  const [inbox, setInbox] = useState(initialInbox);
  const [blockedSenders, setBlockedSenders] = useState(initialBlockedSenders);
  const [notesEnabled, setNotesEnabledState] = useState(initialNotesEnabled);
  const [togglingNotes, setTogglingNotes] = useState(false);

  function handlePromptSent(storyId: string, body: string) {
    const prompt = prompts.find((p) => p.storyId === storyId);
    setPrompts((prev) => prev.filter((p) => p.storyId !== storyId));
    if (prompt) {
      setSent((prev) => [
        { id: `local-${storyId}`, storyId, storyTitle: prompt.storyTitle, writerName: prompt.writerName, body, createdAt: new Date(), replyBody: null, repliedAt: null },
        ...prev,
      ]);
    }
  }

  function handleReplied(noteId: string, replyBody: string) {
    setInbox((prev) => prev.map((n) => (n.id === noteId ? { ...n, replyBody, repliedAt: new Date(), read: true } : n)));
  }

  function handleReported(noteId: string) {
    setInbox((prev) => prev.filter((n) => n.id !== noteId));
  }

  function handleBlocked(userId: string) {
    setInbox((prev) => prev.filter((n) => n.fromUserId !== userId));
  }

  async function toggleNotesEnabled() {
    setTogglingNotes(true);
    const next = !notesEnabled;
    setNotesEnabledState(next);
    try {
      await fetch("/api/kekere/notes/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesEnabled: next }),
      });
    } catch {
      setNotesEnabledState(!next);
    } finally {
      setTogglingNotes(false);
    }
  }

  const unreadCount = inbox.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-[560px] px-[22px] pb-[64px] pt-[24px]">
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--color-ink)]">Notes</h1>

      {isWriter && (
        <div className="mb-5 flex rounded-full bg-[rgba(42,26,18,0.05)] p-1">
          <button
            type="button"
            onClick={() => setTab("sent")}
            className={cn(
              "flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors",
              tab === "sent" ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink-muted-2)]",
            )}
          >
            Sent
          </button>
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={cn(
              "relative flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors",
              tab === "inbox" ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink-muted-2)]",
            )}
          >
            Inbox
            {unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {tab === "sent" && (
        <div className="flex flex-col gap-6">
          {prompts.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-2)]">
                You can send a note
              </h2>
              <div className="flex flex-col gap-2.5">
                {prompts.map((p) => (
                  <PromptRow key={p.storyId} prompt={p} onSent={handlePromptSent} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-2)]">
              Sent
            </h2>
            {sent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-[13px] text-[var(--color-ink-muted-2)]">
                Finish a story to send its writer a note.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sent.map((n) => (
                  <SentNoteRow key={n.id} note={n} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "inbox" && isWriter && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Notes from readers</p>
              <p className="text-[11.5px] text-[var(--color-ink-muted-2)]">
                {notesEnabled ? "Readers who finish your stories can send you a note." : "Turned off — no one can send you notes right now."}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleNotesEnabled}
              disabled={togglingNotes}
              className={cn(
                "relative h-6 w-11 flex-none rounded-full transition-colors disabled:opacity-60",
                notesEnabled ? "bg-[var(--color-primary)]" : "bg-[rgba(42,26,18,0.15)]",
              )}
              aria-label={notesEnabled ? "Turn notes off" : "Turn notes on"}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  notesEnabled ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          {inbox.length === 0 ? (
            <p className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-[13px] text-[var(--color-ink-muted-2)]">
              <InboxIcon size={20} className="text-[var(--color-ink-muted-3)]" />
              No notes yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {inbox.map((n) => (
                <InboxNoteRow key={n.id} note={n} onReplied={handleReplied} onReported={handleReported} onBlocked={handleBlocked} />
              ))}
            </div>
          )}

          {blockedSenders.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted-2)]">
                Blocked
              </h2>
              <div className="flex flex-col gap-2">
                {blockedSenders.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={b.name} color={b.avatarColor} />
                      <span className="text-[13px] font-medium text-[var(--color-ink)]">{b.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch("/api/kekere/notes/block", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: b.id }),
                        }).catch(() => {});
                        setBlockedSenders((prev) => prev.filter((x) => x.id !== b.id));
                      }}
                      className="text-[12px] font-medium text-[var(--color-primary)]"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Link
        href="/kekere/profile"
        className="mt-8 flex items-center justify-center rounded-xl bg-[rgba(199,93,44,0.08)] px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-primary)]"
      >
        Back to profile
      </Link>
    </div>
  );
}
