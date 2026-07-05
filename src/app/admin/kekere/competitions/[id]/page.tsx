import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/typography";
import { CompetitionForm } from "@/components/admin/competition-form";
import { CompetitionEntries } from "@/components/admin/competition-entries";
import { getCompetitionById, listEntriesForAdmin } from "@/lib/data/kekere-competitions";

export const dynamic = "force-dynamic";

export default async function AdminKekereCompetitionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [competition, entries] = await Promise.all([
    getCompetitionById(params.id),
    listEntriesForAdmin(params.id),
  ]);
  if (!competition) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Heading as="h1" size="h2">
          {competition.title}
        </Heading>
        <div className="mt-6">
          <CompetitionForm
            mode="edit"
            competitionId={competition.id}
            initial={{
              slug: competition.slug,
              title: competition.title,
              theme: competition.theme,
              themeDescription: competition.themeDescription,
              deadline: competition.deadline.toISOString().slice(0, 10),
              prizeDescription: competition.prizeDescription,
              wordCountLimit: String(competition.wordCountLimit),
              wordCountMin: competition.wordCountMin ? String(competition.wordCountMin) : "",
              status: competition.status,
            }}
          />
        </div>
      </div>

      <div>
        <Heading as="h2" size="h3">
          Entries ({entries.length})
        </Heading>
        <div className="mt-4">
          <CompetitionEntries
            competitionId={competition.id}
            entries={entries.map((entry) => ({
              id: entry.id,
              storyTitle: entry.story.title,
              authorName: entry.story.author.name,
              storyStatus: entry.story.status,
              placement: entry.placement,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
