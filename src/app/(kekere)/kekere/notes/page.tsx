import { redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { NotesView } from "@/components/kekere/notes-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWriterStats } from "@/lib/data/kekere-profile-stats";
import {
  getAvailablePrompts,
  getReaderNotes,
  getWriterInbox,
  getBlockedSenders,
  getNotesEnabled,
} from "@/lib/data/kekere-notes";

export const dynamic = "force-dynamic";

export default async function KekereNotesPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const writerStats = await getWriterStats(userId);
  const isWriter = writerStats.hasAuthoredAnyStory;

  const [prompts, sent, inbox, blockedSenders, notesEnabled] = await Promise.all([
    getAvailablePrompts(userId),
    getReaderNotes(userId),
    isWriter ? getWriterInbox(userId) : Promise.resolve([]),
    isWriter ? getBlockedSenders(userId) : Promise.resolve([]),
    isWriter ? getNotesEnabled(userId) : Promise.resolve(true),
  ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <NotesView
          isWriter={isWriter}
          initialPrompts={prompts}
          initialSent={sent}
          initialInbox={inbox}
          initialBlockedSenders={blockedSenders}
          initialNotesEnabled={notesEnabled}
        />
      </div>
    </KekereTheme>
  );
}
