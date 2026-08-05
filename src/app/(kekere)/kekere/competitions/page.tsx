import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { CompetitionCard } from "@/components/kekere/competition-card";
import { listCompetitions } from "@/lib/data/kekere-competitions";
import { toMockCompetition } from "@/lib/adapters/kekere-competitions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competitions",
  description: "Writing competitions open to Kekere Stories writers, with cowrie prizes.",
  alternates: { canonical: "/kekere/competitions" },
};

function daysUntil(deadline: Date): number {
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/** Anything a writer can still act on comes first — an open competition is
 *  the whole point of this page, and burying it under finished ones (which
 *  is what a pure deadline sort does once a season ends) hides the only
 *  thing on the page with a deadline attached. Within each band the newest
 *  deadline still leads. */
const STATUS_ORDER: Record<string, number> = {
  OPEN: 0,
  UPCOMING: 1,
  JUDGING: 2,
  CLOSED: 3,
  COMPLETE: 4,
};

export default async function KekereCompetitionsPage() {
  const competitions = await listCompetitions();
  const visible = competitions
    .filter((c) => c.status !== "DRAFT")
    .sort((a, b) => {
      const rank = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (rank !== 0) return rank;
      return b.deadline.getTime() - a.deadline.getTime();
    });

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] pb-[calc(80px+env(safe-area-inset-bottom))] text-[var(--color-ink)]">
        <KekereNavWrapper />

        <header className="px-[22px] pb-[14px] pt-[26px]">
          <p className="mb-[10px] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Competitions
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.08] text-[var(--color-ink)]">
            Enter the conversation
          </h1>
          <p className="mt-3 text-[14.5px] leading-[1.55] text-[var(--color-ink-muted)]">
            Join the winner&apos;s circle and compete with hundreds of writers for cash prizes.
            We hold our competitions four times a year and publish the best stories each season.
            May the best writers win.
          </p>
        </header>

        <section className="flex flex-col gap-[18px] px-[22px] pb-[30px] pt-[14px]">
          {visible.map((competition) => (
            <CompetitionCard
              key={competition.slug}
              competition={toMockCompetition(competition)}
              daysLeft={daysUntil(competition.deadline)}
            />
          ))}
        </section>
      </div>
    </KekereTheme>
  );
}
