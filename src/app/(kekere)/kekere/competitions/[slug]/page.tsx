import { notFound } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { CompetitionDetail } from "@/components/kekere/competition-detail";
import { getCompetitionBySlug, getPublicWinners } from "@/lib/data/kekere-competitions";
import { toMockCompetition } from "@/lib/adapters/kekere-competitions";

export const dynamic = "force-dynamic";

export default async function KekereCompetitionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const competition = await getCompetitionBySlug(params.slug);
  if (!competition || competition.status === "DRAFT") notFound();

  const winners = await getPublicWinners(competition.id);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />
        <CompetitionDetail competition={toMockCompetition(competition, winners)} />
      </div>
    </KekereTheme>
  );
}
