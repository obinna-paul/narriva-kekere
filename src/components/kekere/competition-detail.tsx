"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getStoryById } from "@/content/mock/kekere-stories";
import type { MockCompetition } from "@/content/mock/kekere-competitions";

const NARRIVA_PRIZE_COPY =
  "Every season, one winner gets read by Narriva — for real. Not a mention. Not a badge. An actual manuscript read by an actual editor at the publishing house this app is named after. Most writers start here.";

function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState<number>(() => new Date(deadline).getTime() - Date.now());

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
  return { days, hours, minutes };
}

export interface CompetitionDetailProps {
  competition: MockCompetition;
}

export function CompetitionDetail({ competition }: CompetitionDetailProps) {
  const countdown = useCountdown(competition.deadline);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 pb-28 sm:px-8 md:pb-12">
      <Link href="/kekere/competitions" className="text-sm font-medium text-[var(--color-ink)]/60">
        ← All competitions
      </Link>

      <h1 className="mt-4 text-3xl font-bold">{competition.title}</h1>
      <p className="mt-1 text-lg font-medium text-[var(--color-primary)]">{competition.theme}</p>

      <p className="mt-5 text-base leading-relaxed text-[var(--color-ink)]/80">
        {competition.themeDescription}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-[var(--color-ink)]/[0.04] p-5 text-sm">
        <div>
          <p className="text-[var(--color-ink)]/50">Deadline</p>
          <p className="mt-0.5 font-semibold">
            {new Date(competition.deadline).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-ink)]/50">Word limit</p>
          <p className="mt-0.5 font-semibold">{competition.wordCountLimit.toLocaleString()} words</p>
        </div>
        {competition.status === "OPEN" && countdown && (
          <div className="col-span-2">
            <p className="text-[var(--color-ink)]/50">Closes in</p>
            <p className="mt-0.5 font-semibold">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border-l-4 border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-5">
        <p className="text-sm leading-relaxed text-[var(--color-ink)]/85">{NARRIVA_PRIZE_COPY}</p>
        <p className="mt-3 text-sm font-medium text-[var(--color-ink)]/70">
          {competition.prizeDescription}
        </p>
      </div>

      {competition.status === "OPEN" &&
        (countdown ? (
          <Link
            href={`/kekere/write?competition=${competition.slug}`}
            className={cn(buttonVariants({ size: "lg" }), "mt-7 w-full rounded-full")}
          >
            Submit your story
          </Link>
        ) : (
          // Deadline has passed but an admin hasn't flipped status to CLOSED
          // yet — don't rely on that manual step to hide the submit button.
          <p className="mt-7 rounded-full bg-[var(--color-ink)]/10 px-6 py-3 text-center text-sm font-medium text-[var(--color-ink)]/60">
            Submissions closed
          </p>
        ))}

      {competition.pastWinners && competition.pastWinners.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold">Past winners</h2>
          <div className="mt-4 flex flex-col gap-3">
            {competition.pastWinners.map((winner) => {
              const story = getStoryById(winner.storyId);
              return (
                <Link
                  key={winner.storyId}
                  href={story ? `/kekere/story/${story.id}` : "#"}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-ink)]/10 px-4 py-3 hover:border-[var(--color-primary)]/40"
                >
                  <div>
                    <p className="font-semibold">{winner.title}</p>
                    <p className="text-sm text-[var(--color-ink)]/60">{winner.authorName}</p>
                  </div>
                  <span className="text-sm text-[var(--color-primary)]">Read →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
