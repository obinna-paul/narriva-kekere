import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WriterEditor } from "@/components/kekere/writer-editor";
import { WriterDashboard } from "@/components/kekere/writer-dashboard";
import { getCompetitionBySlug } from "@/lib/data/kekere-competitions";
import { getKekereUserProfile } from "@/lib/data/kekere-profile-stats";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export const dynamic = "force-dynamic";

function closesInLabel(deadline: Date): string {
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Closing soon";
  return `Closes in ${days} day${days === 1 ? "" : "s"}`;
}

export default async function KekereWritePage({
  searchParams,
}: {
  searchParams: { competition?: string; id?: string; new?: string };
}) {
  // No story ID and not explicitly creating new → show the story picker dashboard
  if (!searchParams.id && !searchParams.new) {
    const competition = searchParams.competition
      ? await getCompetitionBySlug(searchParams.competition)
      : null;

    return (
      <KekereTheme>
        <KekereNavWrapper />
        <WriterDashboard
          competitionSlug={searchParams.competition}
          competitionTitle={competition?.title}
          competitionDeadlineLabel={competition ? closesInLabel(competition.deadline) : undefined}
        />
      </KekereTheme>
    );
  }

  // Has an ID or ?new=1 → open the editor (new=1 creates a fresh draft)
  const competition = searchParams.competition
    ? await getCompetitionBySlug(searchParams.competition)
    : null;

  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await getKekereUserProfile(session.user.id) : null;

  return (
    <KekereTheme>
      <WriterEditor
        competitionId={competition?.id}
        competitionSlug={searchParams.competition}
        competitionTitle={competition?.title}
        competitionDeadlineLabel={competition ? closesInLabel(competition.deadline) : undefined}
        initialStoryId={searchParams.id}
        authorName={profile?.name ?? undefined}
        authorAvatarUrl={profile?.avatar ?? null}
        authorAvatarColor={profile?.avatarColor ?? null}
      />
    </KekereTheme>
  );
}
