import { KekereTheme } from "@/components/theme";
import { WriterEditor } from "@/components/kekere/writer-editor";
import { getCompetitionBySlug } from "@/lib/data/kekere-competitions";

export const dynamic = "force-dynamic";

function closesInLabel(deadline: Date): string {
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Closing soon";
  return `Closes in ${days} day${days === 1 ? "" : "s"}`;
}

export default async function KekereWritePage({
  searchParams,
}: {
  searchParams: { competition?: string; id?: string };
}) {
  const competition = searchParams.competition
    ? await getCompetitionBySlug(searchParams.competition)
    : null;

  return (
    <KekereTheme>
      {/* Its own universe, per the design handoff — no global nav here, just
          the in-editor "Kekere" wordmark (links back to the feed). */}
      <WriterEditor
        competitionId={competition?.id}
        competitionSlug={searchParams.competition}
        competitionTitle={competition?.title}
        competitionDeadlineLabel={competition ? closesInLabel(competition.deadline) : undefined}
        initialStoryId={searchParams.id}
      />
    </KekereTheme>
  );
}
