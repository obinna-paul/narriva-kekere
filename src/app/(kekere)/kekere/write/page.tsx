import { KekereTheme } from "@/components/theme";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { WriterEditor } from "@/components/kekere/writer-editor";
import { getCompetitionBySlug } from "@/lib/data/kekere-competitions";

export const dynamic = "force-dynamic";

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
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />
        <WriterEditor
          competitionId={competition?.id}
          competitionSlug={searchParams.competition}
          competitionTitle={competition?.title}
          initialStoryId={searchParams.id}
        />
      </div>
    </KekereTheme>
  );
}
