import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { listStories } from "@/lib/data/kekere-stories";
import { getKekereLandingStats } from "@/lib/data/kekere-landing";
import { listCompetitions } from "@/lib/data/kekere-competitions";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { LandingAuthButton } from "@/components/kekere/landing-auth-button";
import { KekereFooter } from "@/components/kekere/kekere-footer";
import type { MockStory } from "@/content/mock/kekere-stories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/kekere" },
};

const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const GENRE_TAGS = ["Love", "Speculative", "Lagos", "Satire", "Historical", "Humour"];

const PILLARS = [
  {
    glyph: "◷",
    iconBg: "rgba(199,93,44,0.14)",
    iconColor: "#C75D2C",
    title: "Read in minutes",
    body: "Short fiction sized for real life — commutes, lunch breaks, the time before sleep.",
  },
  {
    glyph: "✶",
    iconBg: "rgba(31,75,75,0.12)",
    iconColor: "#1F4B4B",
    title: "New African voices",
    body: "Stories from emerging writers across the continent and diaspora.",
  },
  {
    glyph: "◍",
    iconBg: "rgba(199,93,44,0.14)",
    iconColor: "#C75D2C",
    title: "Support writers directly",
    body: "Unlock stories with cowries — every unlock goes back to the community.",
  },
];

const HERO_CARDS = [
  {
    genre: "SPECULATIVE",
    title: "Small Gods of Balogun",
    hook: "Every stall has a spirit. Mama Risi sells them back to you.",
    cost: "15 cowries · 7 min",
    bg: "conic-gradient(from 30deg,#1F4B4B,#2E6A5E,#1F4B4B,#143838,#1F4B4B)",
    col: 0,
    animation: "7s",
    rotate: "1.5deg",
    bright: false,
  },
  {
    genre: "HISTORICAL",
    title: "Cowrie",
    hook: "Sold for a string of shells, she chose to remember the price.",
    cost: "10 cowries · 8 min",
    bg: "conic-gradient(#C75D2C 0 25%,#E2A565 0 50%,#C75D2C 0 75%,#E2A565 0)",
    col: 0,
    animation: "",
    rotate: "-2deg",
    bright: false,
  },
  {
    genre: "LOVE",
    title: "The Last Bus to Yaba",
    hook: "She missed it on purpose. He didn't.",
    cost: "12 cowries · 4 min",
    bg: "radial-gradient(circle at 32% 28%,#F0B878,#C75D2C 52%,#7A3415)",
    col: 1,
    animation: "8s",
    rotate: "2.5deg",
    bright: true,
  },
  {
    genre: "SATIRE",
    title: "Letters to NEPA",
    hook: "He wrote the power company every day for a year.",
    cost: "6 cowries · 4 min",
    bg: "repeating-linear-gradient(0deg,#2A1A12 0 6px,#3A2418 6px 12px)",
    col: 1,
    animation: "",
    rotate: "-1.5deg",
    bright: false,
  },
];

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function thumbnailPattern(seed: string): string {
  const i = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns = [
    "repeating-linear-gradient(45deg,#C75D2C 0 14px,#A84A20 14px 28px)",
    "conic-gradient(from 30deg,#1F4B4B,#2E6A5E,#1F4B4B,#143838,#1F4B4B)",
    "radial-gradient(circle at 30% 30%,#E2A565,#C75D2C 45%,#7A3415)",
    "linear-gradient(135deg,#1F4B4B 0 50%,#E2A565 50% 100%)",
    "conic-gradient(#C75D2C 0 25%,#E2A565 0 50%,#C75D2C 0 75%,#E2A565 0)",
  ];
  return patterns[i % patterns.length];
}

function HeroCard({
  card,
  offset,
}: {
  card: (typeof HERO_CARDS)[number];
  offset: boolean;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl shadow-[0_22px_48px_-18px_rgba(0,0,0,0.7)]"
      style={{
        background: card.bright ? "#C75D2C" : "#3A2418",
        border: card.bright ? "none" : "1px solid rgba(245,235,221,0.1)",
        transform: `rotate(${card.rotate})`,
        animation: card.animation
          ? `floaty ${card.animation} ease-in-out infinite`
          : undefined,
      }}
    >
      {card.bright && (
        <div
          className="h-[92px] relative"
          style={{ background: card.bg }}
        >
          <span className="absolute left-[9px] top-[9px] rounded-[20px] bg-[rgba(245,235,221,0.9)] px-2 py-[3px] text-[9px] font-bold tracking-[0.05em] text-[#2A1A12]">
            {card.genre}
          </span>
        </div>
      )}
      {!card.bright && (
        <div
          className="h-[92px] relative"
          style={{ background: card.bg }}
        >
          <span className="absolute left-[9px] top-[9px] rounded-[20px] bg-[rgba(31,75,75,0.82)] px-2 py-[3px] text-[9px] font-bold tracking-[0.05em] text-white">
            {card.genre}
          </span>
        </div>
      )}
      <div className="px-[14px] pb-[15px] pt-[13px]">
        <div
          className="font-[family-name:var(--font-display)] text-base font-semibold leading-[1.16]"
          style={{ color: card.bright ? "#fff" : "#F7EFE3" }}
        >
          {card.title}
        </div>
        <p
          className="mt-[5px] text-[11.5px] italic leading-[1.35]"
          style={{
            color: card.bright
              ? "rgba(255,255,255,0.82)"
              : "rgba(245,235,221,0.55)",
          }}
        >
          {card.hook}
        </p>
        <p
          className="mt-[9px] text-[10.5px] font-semibold"
          style={{ color: card.bright ? "#fff" : "#E08A4A" }}
        >
          {card.cost}
        </p>
      </div>
    </div>
  );
}

export default async function KekereLandingPage() {
  const session = await getCurrentSession();
  const isLoggedIn = !!session?.user;
  const user = session?.user ?? null;

  const [stats, stories, competitions] = await Promise.all([
    getKekereLandingStats(),
    listStories({ sort: "trending", pageSize: 5 }),
    listCompetitions({ status: ["OPEN", "JUDGING"] }),
  ]);

  const featuredStories = stories.stories.map((s) => toFeedStoryData(s));
  const competition = competitions[0] ?? null;

  return (
    <KekereTheme>
      <main className="overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-ink)]">
        {/* ======== HERO ======== */}
        <section className="relative flex min-h-[94vh] flex-col overflow-hidden bg-[#2A1A12]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${GRAIN_SVG}")`,
              opacity: 0.11,
              mixBlendMode: "overlay",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-5%] top-[-10%] h-[80%] w-[70%]"
            style={{
              background:
                "radial-gradient(closest-side,rgba(199,93,44,0.42),rgba(199,93,44,0))",
            }}
          />

          <div className="relative z-[3] mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-[22px]">
            <Link href="/kekere" className="inline-block">
              <Image
                src="/kekere-logo.png"
                alt="Kekere Stories"
                width={48}
                height={48}
                className="h-[48px] w-auto"
                priority
              />
            </Link>
            <LandingAuthButton isLoggedIn={isLoggedIn} />
          </div>

          <div className="relative z-[2] mx-auto flex w-full max-w-[1200px] flex-1 flex-wrap items-center gap-x-[56px] gap-y-10 px-6 pb-16 pt-6">
            <div className="min-w-[300px] flex-[1_1_400px]">
              <div className="mb-6 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="block h-[2px] w-[26px] bg-[#E08A4A]"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E08A4A]">
                  Kekere Stories
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-[clamp(40px,5.4vw,66px)] font-semibold leading-[1.04] text-[var(--color-cream)]">
                Kekere means small.
                <br />
                <span className="italic text-[var(--color-sand-accent)]">
                  The stories don&apos;t
                  <br />
                  stay that way.
                </span>
              </h1>

              <p className="mt-6 max-w-[430px] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[rgba(245,235,221,0.74)]">
                Short fiction, specially curated, from the finest African
                writers. Read in the time it takes to wait for a bus, finish a
                meal, or fall asleep.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-[22px]">
                <Link
                  href={isLoggedIn ? "/kekere/feed" : "/login"}
                  className="inline-block rounded-[10px] bg-[var(--color-primary)] px-[34px] py-4 text-base font-semibold text-white shadow-[0_14px_34px_-10px_rgba(199,93,44,0.7)] transition-colors hover:bg-[var(--color-primary-light)]"
                >
                  {isLoggedIn ? "Go to feed" : "Sign in"}
                </Link>
                <Link
                  href={isLoggedIn ? "/kekere/write" : "/signup"}
                  className="border-b border-[rgba(233,201,163,0.4)] pb-[3px] text-[15px] font-semibold text-[var(--color-sand-accent)] transition-colors hover:border-[var(--color-sand-accent)]"
                >
                  Write & Earn →
                </Link>
              </div>

              <div className="mt-[34px] flex flex-wrap gap-[9px]">
                {GENRE_TAGS.map((g) => (
                  <span
                    key={g}
                    className="rounded-[30px] border border-[rgba(233,201,163,0.28)] px-[13px] py-[6px] text-[12.5px] font-medium text-[rgba(245,235,221,0.82)]"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p className="mt-[26px] text-[13px] text-[rgba(245,235,221,0.5)]">
                New stories every week · {stats.writerCount}+ writers across the
                continent &amp; diaspora
              </p>
            </div>

            <div className="min-w-[300px] flex-[1_1_420px] justify-center hidden md:flex">
              <div className="flex w-full max-w-[440px] gap-4" style={{ transform: "rotate(-2deg)" }}>
                {[0, 1].map((col) => (
                  <div
                    key={col}
                    className="flex flex-1 flex-col gap-4"
                    style={{ marginTop: col === 1 ? 38 : 0 }}
                  >
                    {HERO_CARDS.filter((c) => c.col === col).map((card) => (
                      <HeroCard
                        key={card.title}
                        card={card}
                        offset={col === 1}
                      />
                    ))}
                    {col === 1 && (
                      <div className="py-1 text-center">
                        <span className="text-xs font-semibold text-[rgba(245,235,221,0.55)]">
                          + {Math.max(0, stats.storyCount - 4)} more stories
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-[2] pb-[22px] text-center text-xl text-[rgba(245,235,221,0.4)]">
            ↓
          </div>
        </section>

        {/* ======== WHAT IS KEKERE ======== */}
        <section className="px-[22px] py-[60px]">
          <div className="mx-auto flex max-w-[1100px] flex-wrap gap-[34px]">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="flex min-w-0 flex-[1_1_280px] gap-4"
              >
                <div
                  className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-xl text-xl"
                  style={{ background: p.iconBg, color: p.iconColor }}
                >
                  {p.glyph}
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
                    {p.title}
                  </h3>
                  <p className="mt-[6px] text-[14.5px] leading-[1.55] text-[var(--color-ink-muted)]">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======== FEATURED STORIES ======== */}
        <section className="bg-[var(--color-bg-warm)] pb-[56px] pt-2">
          <div className="mx-auto max-w-[1100px] px-[22px] pb-[22px] pt-10">
            <p className="mb-[10px] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Now reading
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(26px,3vw,34px)] font-semibold leading-[1.12] text-[var(--color-primary)]">
              Stories worth your time
            </h2>
          </div>

          <div
            className="scrollx flex gap-4 overflow-x-auto px-[max(22px,calc((100%-1100px)/2+22px))] pb-[10px] pt-[6px]"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {featuredStories.map((story) => (
              <div
                key={story.id}
                className="w-[140px] flex-none"
                style={{ scrollSnapAlign: "start" }}
              >
                <Link href={`/kekere/story/${story.id}`}>
                  <div
                    className="relative aspect-[3/4] overflow-hidden rounded-[14px] shadow-[var(--shadow-card)]"
                    style={{ background: story.coverImageUrl ? undefined : thumbnailPattern(story.id) }}
                  >
                    {story.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={story.coverImageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    )}
                    <span className="absolute left-[10px] top-[10px] rounded-[20px] bg-[rgba(31,75,75,0.78)] px-[9px] py-1 text-[10px] font-semibold tracking-[0.04em] text-white">
                      {story.genre.toUpperCase()}
                    </span>
                  </div>
                </Link>
                <div className="mt-3">
                  <Link href={`/kekere/story/${story.id}`}>
                    <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold leading-[1.2] text-[var(--color-ink)]">
                      {story.title}
                    </h3>
                  </Link>
                  <p className="mt-[5px] text-[13px] italic leading-[1.4] text-[var(--color-ink-muted)]">
                    {story.hookLine}
                  </p>
                  <div className="mt-[9px] flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {story.cowrieCost} cowries
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted-3)]">
                      ·
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted-2)]">
                      {story.readingTimeMinutes} min
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="w-[140px] flex-none opacity-50 blur-[3px]">
              <div
                className="aspect-[3/4] rounded-[14px]"
                style={{
                  background: "linear-gradient(135deg,#C75D2C,#1F4B4B)",
                }}
              />
              <div className="mt-[14px] h-[14px] rounded-md bg-[#d8c6b2]" />
              <div className="mt-2 h-[10px] w-[70%] rounded-md bg-[#d8c6b2]" />
            </div>
            <div className="w-[22px] flex-none" />
          </div>

          <div className="px-[22px] pt-[14px] text-center">
            <Link
              href={isLoggedIn ? "/kekere/feed" : "/signup"}
              className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:underline"
            >
              {isLoggedIn ? "Read all of them →" : "Sign up to read all of them →"}
            </Link>
          </div>
        </section>

        {/* ======== COMPETITIONS ======== */}
        {competition && (
          <section className="px-[22px] py-[60px]">
            <div className="mx-auto max-w-[760px]">
              <p className="mb-[10px] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                This season
              </p>
              <h2 className="mb-[22px] font-[family-name:var(--font-display)] text-[clamp(26px,3vw,34px)] font-semibold text-[var(--color-ink)]">
                Enter the conversation
              </h2>

              <div className="relative overflow-hidden rounded-[18px] bg-[#2A1A12] px-7 py-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `url("${GRAIN_SVG}")`,
                    opacity: 0.08,
                    mixBlendMode: "overlay",
                  }}
                />
                <div className="relative">
                  <span className="inline-block rounded-[20px] bg-[var(--color-primary)] px-3 py-[5px] text-[11px] font-semibold tracking-[0.04em] text-white">
                    {competition.status === "OPEN"
                      ? `OPEN · ${daysUntil(competition.deadline)} days left`
                      : "JUDGING"}
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-[1.18] text-[var(--color-cream)]">
                    {competition.title}
                  </h3>
                  <p className="mt-[10px] max-w-[520px] text-[15px] leading-[1.55] text-[rgba(245,235,221,0.72)]">
                    {competition.themeDescription || competition.theme}
                  </p>
                  <p className="mt-4 max-w-[520px] text-[14px] font-semibold text-[var(--color-sand-accent)]">
                    {competition.prizeDescription}
                  </p>
                  <Link
                    href={`/kekere/competitions/${competition.slug}`}
                    className="mt-5 inline-block rounded-lg bg-[var(--color-sand-accent)] px-[22px] py-[11px] text-sm font-semibold text-[#2A1A12] transition-colors hover:bg-[#d4b88e]"
                  >
                    See competition
                  </Link>
                </div>
              </div>

              <p className="mt-[18px] text-center text-[13.5px] italic leading-[1.5] text-[var(--color-ink-muted-2)]">
                Competitions run four seasons every year.
              </p>
            </div>
          </section>
        )}

        {/* ======== FOR WRITERS ======== */}
        <section className="px-[22px] pb-[56px] pt-2">
          <div className="relative mx-auto max-w-[880px] overflow-hidden rounded-[18px] bg-[var(--color-primary)] px-[30px] py-9 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url("${GRAIN_SVG}")`,
                opacity: 0.1,
                mixBlendMode: "overlay",
              }}
            />
            <div className="relative flex flex-wrap items-center gap-[30px]">
              <div className="min-w-0 flex-[1_1_300px]">
                <h2 className="font-[family-name:var(--font-display)] text-[clamp(24px,2.6vw,30px)] font-semibold leading-[1.14]">
                  Small stories.
                  <br />
                  Real audiences.
                </h2>
                <p className="mt-[14px] max-w-[380px] text-[15px] leading-[1.6] text-[rgba(255,255,255,0.9)]">
                  Write a story. Submit it. If it&apos;s good, we publish it —
                  and readers unlock it with cowries. Competitions run every
                  season, with real prizes.
                </p>
                <Link
                  href={isLoggedIn ? "/kekere/write" : "/signup"}
                  className="mt-[22px] inline-block rounded-lg bg-white px-7 py-[13px] text-[15px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#f0e8d8]"
                >
                  Start writing
                </Link>
              </div>
              <div className="min-w-0 flex-[1_1_260px]">
                <div className="rounded-xl bg-[var(--color-bg)] p-[18px] text-[var(--color-ink)] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
                      The Last Bus to Yaba
                    </span>
                    <span className="rounded-[20px] bg-[rgba(31,75,75,0.12)] px-2 py-[3px] text-[10px] font-semibold text-[var(--color-accent)]">
                      Draft
                    </span>
                  </div>
                  <div className="mt-[14px] h-2 rounded bg-[#E2D3C0]" />
                  <div className="mt-[7px] h-2 w-[88%] rounded bg-[#E2D3C0]" />
                  <div className="mt-[7px] h-2 w-[72%] rounded bg-[#E2D3C0]" />
                  <p className="mt-4 text-[11px] text-[var(--color-ink-muted-2)]">
                    1,247 words · ~5 min read · Saved
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======== FINAL CTA ======== */}
        <section className="relative overflow-hidden bg-[#2A1A12] px-[22px] py-[72px] text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${GRAIN_SVG}")`,
              opacity: 0.1,
              mixBlendMode: "overlay",
            }}
          />
          <div className="relative">
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(30px,4vw,42px)] font-semibold leading-[1.14] text-[var(--color-cream)]">
              Your next story is
              <br />
              already waiting.
            </h2>
            <Link
              href={isLoggedIn ? "/kekere/feed" : "/login"}
              className="mt-7 inline-block rounded-[10px] bg-[var(--color-primary)] px-10 py-4 text-base font-semibold text-white shadow-[0_14px_34px_-10px_rgba(199,93,44,0.7)] transition-colors hover:bg-[var(--color-primary-light)]"
            >
              {isLoggedIn ? "Go to feed" : "Sign in"}
            </Link>
          </div>
        </section>
      </main>
      <KekereFooter />
    </KekereTheme>
  );
}
