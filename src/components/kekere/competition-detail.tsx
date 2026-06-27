"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoryById } from "@/content/mock/kekere-stories";
import type { MockCompetition } from "@/content/mock/kekere-competitions";

const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const DEFAULT_RULES: readonly string[] = [
  "2,000 words maximum. Shorter is welcome.",
  "Open to writers across Africa and the diaspora.",
  "Previously unpublished stories only.",
  "One entry per writer. Submit through the writer's editor.",
];

function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState<number>(
    () => new Date(deadline).getTime() - Date.now(),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (remaining <= 0) return null;

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);
  return { days, hours, minutes, seconds };
}

const STATUS_LABELS: Record<MockCompetition["status"], string> = {
  DRAFT: "Draft",
  OPEN: "OPEN",
  JUDGING: "JUDGING",
  CLOSED: "CLOSED",
  COMPLETE: "COMPLETE",
};

export interface CompetitionDetailProps {
  competition: MockCompetition;
}

export function CompetitionDetail({ competition }: CompetitionDetailProps) {
  const countdown = useCountdown(competition.deadline);
  const rules = competition.rules && competition.rules.length > 0 ? competition.rules : DEFAULT_RULES;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-10">
      <div className="relative overflow-hidden bg-[#2A1A12] px-[22px] pb-9 pt-[18px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${GRAIN_SVG}")`,
            opacity: 0.1,
            mixBlendMode: "overlay",
          }}
        />

        <Link
          href="/kekere/competitions"
          aria-label="Back to competitions"
          className="relative text-xl text-[rgba(245,235,221,0.8)]"
        >
          ←
        </Link>

        <div className="relative mt-6">
          <span className="inline-block rounded-[20px] bg-[var(--color-primary)] px-3 py-[5px] text-[11px] font-semibold text-white">
            {STATUS_LABELS[competition.status]}
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.08] text-[var(--color-cream)]">
            {competition.title}
          </h1>
          <p className="mt-3 text-[15.5px] italic leading-[1.5] text-[rgba(245,235,221,0.78)]">
            {competition.theme}
          </p>
        </div>

        {countdown && (
          <div className="relative mt-[26px] flex gap-[10px]">
            {[
              { val: countdown.days, label: "Days" },
              { val: String(countdown.hours).padStart(2, "0"), label: "Hours" },
              { val: String(countdown.minutes).padStart(2, "0"), label: "Mins" },
              { val: String(countdown.seconds).padStart(2, "0"), label: "Secs" },
            ].map((unit) => (
              <div
                key={unit.label}
                className="flex-1 rounded-xl border border-[rgba(245,235,221,0.12)] bg-[rgba(245,235,221,0.08)] py-3 text-center"
              >
                <div className="font-[family-name:var(--font-display)] text-[26px] font-semibold text-[var(--color-sand-accent)]">
                  {unit.val}
                </div>
                <div className="mt-[3px] text-[10px] uppercase tracking-[0.08em] text-[rgba(245,235,221,0.55)]">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[620px] px-[22px] pt-9">
        <section className="mb-9">
          <h2 className="mb-[14px] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            The prompt
          </h2>
          <p className="text-base leading-[1.7] text-[var(--color-ink)]">
            {competition.themeDescription || competition.theme}
          </p>
        </section>

        <section className="mb-9">
          <h2 className="mb-[14px] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Rules
          </h2>
          <div>
            {rules.map((rule, i) => (
              <div
                key={i}
                className="flex gap-[14px] border-b border-[rgba(42,26,18,0.08)] py-[13px]"
              >
                <span className="mt-2 h-[6px] w-[6px] flex-none rounded-full bg-[var(--color-primary)]" />
                <span className="text-[15px] leading-[1.55] text-[#3A2A20]">
                  {rule}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-[14px] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            The prize
          </h2>
          <div className="rounded-2xl border border-[rgba(42,26,18,0.1)] bg-white p-6">
            {competition.prizeAmount && (
              <>
                <div className="font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-primary)]">
                  {competition.prizeAmount}
                </div>
                <p className="mt-1 text-[13.5px] text-[var(--color-ink-muted-2)]">
                  for the winning story
                </p>
              </>
            )}
            <p
              className="text-[15px] leading-[1.65] text-[#3A2A20]"
              style={
                competition.prizeAmount
                  ? {
                      marginTop: 18,
                      paddingTop: 18,
                      borderTop: "1px solid rgba(42,26,18,0.08)",
                    }
                  : undefined
              }
            >
              {competition.prizeDescription}
            </p>
          </div>
        </section>

        {competition.status === "OPEN" &&
          (countdown ? (
            <Link
              href={`/kekere/write?competition=${competition.slug}`}
              className="block rounded-xl bg-[var(--color-primary)] px-4 py-[17px] text-center text-base font-semibold text-white shadow-[0_12px_28px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)]"
            >
              Submit your story
            </Link>
          ) : (
            <p className="rounded-xl bg-[var(--color-ink)]/10 px-4 py-[17px] text-center text-sm font-medium text-[var(--color-ink)]/60">
              Submissions closed
            </p>
          ))}

        {countdown && competition.status === "OPEN" && (
          <p className="mt-[14px] text-center text-[12.5px] text-[var(--color-ink-muted-3)]">
            Closes{" "}
            {new Date(competition.deadline).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            . One entry per writer.
          </p>
        )}

        {competition.pastWinners && competition.pastWinners.length > 0 && (
          <div className="mt-10 pb-10">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
              Past winners
            </h2>
            <div className="flex flex-col gap-3">
              {competition.pastWinners.map((winner) => {
                const story = getStoryById(winner.storyId);
                return (
                  <Link
                    key={winner.storyId}
                    href={story ? `/kekere/story/${story.id}` : "#"}
                    className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[rgba(42,26,18,0.08)] transition-colors hover:ring-[var(--color-primary)]/40"
                  >
                    <div>
                      <p className="font-medium text-[var(--color-ink)]">
                        {winner.title}
                      </p>
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        {winner.authorName}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--color-primary)]">
                      Read →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
