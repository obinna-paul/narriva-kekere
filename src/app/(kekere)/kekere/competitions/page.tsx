import { KekereTheme } from "@/components/theme";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { CompetitionCard } from "@/components/kekere/competition-card";
import { listCompetitions } from "@/lib/data/kekere-competitions";
import { toMockCompetition } from "@/lib/adapters/kekere-competitions";

export const dynamic = "force-dynamic";

export default async function KekereCompetitionsPage() {
  const competitions = await listCompetitions();
  // DRAFT competitions aren't public yet — they're admin previews only.
  const visible = competitions.filter((c) => c.status !== "DRAFT");

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />
        <main className="mx-auto max-w-5xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
          <h1 className="text-2xl font-bold">Competitions</h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/60">
            One winner a season gets a real manuscript read at Narriva.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visible.map((competition) => (
              <CompetitionCard key={competition.slug} competition={toMockCompetition(competition)} />
            ))}
          </div>
        </main>
      </div>
    </KekereTheme>
  );
}
