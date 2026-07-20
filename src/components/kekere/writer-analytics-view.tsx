import Link from "next/link";
import { ChevronLeft, ArrowRight, Star, BookOpen, Heart, Sparkles, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";
import type {
  WriterOverview,
  WriterEarningsSummary,
  DailyPoint,
  StoryAnalyticsRow,
} from "@/lib/data/kekere-writer-analytics";

export interface WriterAnalyticsViewProps {
  overview: WriterOverview;
  earnings: WriterEarningsSummary;
  earningsSeries: DailyPoint[];
  followerSeries: DailyPoint[];
  stories: StoryAnalyticsRow[];
}

const NAIRA_RATE = 50;
const GREEN = "#1F8A5B";
const GREEN_DEEP = "#176E48";
const ORANGE = "#C75D2C";

function formatStat(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1)}k`;
  }
  return n.toString();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted-2)]">
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white p-4", className)}>
      {children}
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-[family-name:var(--font-display)] text-[20px] font-semibold leading-none text-[var(--color-primary)]">
        {value}
      </div>
      <div className="mt-[6px] text-[11px] leading-[1.3] text-[var(--color-ink-muted-2)]">{label}</div>
    </div>
  );
}

/** A small circular progress ring — the completion rate's visual anchor.
 *  Pure geometry off the one real number (avgCompletionRate), nothing
 *  invented: circumference math + stroke-dasharray, no chart library. */
function CompletionRing({ pct }: { pct: number | null }) {
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = pct ?? 0;
  const dash = (value / 100) * c;

  return (
    <div className="relative flex h-[72px] w-[72px] flex-none items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(42,26,18,0.08)" strokeWidth={stroke} />
        {pct !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ORANGE}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="absolute font-[family-name:var(--font-display)] text-[15px] font-semibold text-[var(--color-ink)]">
        {pct !== null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}

/** Hand-rolled SVG area-sparkline — a filled gradient under the line gives
 *  it real dashboard weight without pulling in a charting library. Same
 *  polyline-math approach as the admin Command Center's Sparkline,
 *  restyled and given a fill. */
function AreaSparkline({ data, color, gradientId }: { data: number[]; color: string; gradientId: string }) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return (
      <div className="flex h-[72px] items-center justify-center text-[12px] text-[var(--color-ink-muted-3)]">
        Nothing yet this period
      </div>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 72;
  const top = 6;
  const bottom = h - 6;

  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: bottom - ((v - min) / range) * (bottom - top),
  }));
  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${coords[0].x},${bottom} ${coords.map((p) => `L${p.x},${p.y}`).join(" ")} L${coords[coords.length - 1].x},${bottom} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoryCoverThumb({ coverColor, coverImageRef }: { coverColor: string; coverImageRef: string | null }) {
  return (
    <div
      className="relative h-[58px] w-[44px] flex-none overflow-hidden rounded-[8px] shadow-[0_2px_8px_rgba(42,26,18,0.15)]"
      style={{ backgroundColor: coverColor }}
    >
      {coverImageRef && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={storyCoverUrl(coverImageRef)} alt="" className="h-full w-full object-cover" loading="lazy" />
      )}
    </div>
  );
}

function EmptyState({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-[rgba(42,26,18,0.15)] bg-[rgba(42,26,18,0.02)] px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(42,26,18,0.06)] text-[var(--color-ink-muted)]">
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</p>
        <p className="mt-1 text-[12.5px] text-[var(--color-ink-muted-2)]">{note}</p>
      </div>
    </div>
  );
}

export function WriterAnalyticsView({ overview, earnings, earningsSeries, followerSeries, stories }: WriterAnalyticsViewProps) {
  const earningsTotal = earningsSeries.reduce((sum, p) => sum + p.value, 0);
  const followerDelta = followerSeries.length > 1 ? followerSeries[followerSeries.length - 1].value - followerSeries[0].value : 0;

  const exampleCost = 3;
  const exampleWriterShare = Math.round(exampleCost * (earnings.writerRatePercent / 100) * 100) / 100;
  const maxReads = Math.max(1, ...stories.map((s) => s.reads));

  return (
    <div className="mx-auto max-w-[440px] px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="mb-[26px] flex items-center gap-3">
        <Link
          href="/kekere/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]"
          aria-label="Back to profile"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          Analytics &amp; earnings
        </span>
      </div>

      {/* Earnings ledger */}
      <section className="mb-7">
        <SectionLabel>Earnings</SectionLabel>
        <div
          className="relative overflow-hidden rounded-[20px] shadow-[0_10px_36px_rgba(23,110,72,0.28)]"
          style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)` }}
        >
          {/* Decorative texture — a faint radial glow, purely cosmetic */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-[220px] w-[220px] rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)" }}
          />
          <div className="relative px-5 py-5">
            <span className="text-[13px] font-medium text-white/80">Available to withdraw</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[36px] font-semibold text-white tracking-[-0.01em]">
              {earnings.available.toFixed(2)} <span className="text-[22px] text-white/85">cowries</span>
            </div>
            <div className="mt-1 text-[14px] text-white/70">~&#8358;{(earnings.available * NAIRA_RATE).toLocaleString()}</div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <div>
                <div className="text-[11px] text-white/60">Pending withdrawal</div>
                <div className="mt-0.5 text-[15px] font-semibold text-white">{earnings.pending.toFixed(2)}</div>
                {earnings.activeWithdrawal && (
                  <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-[1px] text-[10px] font-medium text-white/85">
                    {earnings.activeWithdrawal.status === "PENDING" && "Awaiting review"}
                    {earnings.activeWithdrawal.status === "APPROVED" && "Approved"}
                    {earnings.activeWithdrawal.status === "PROCESSING" && "Sending to your bank"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-white/60">Lifetime earned</div>
                <div className="mt-0.5 text-[15px] font-semibold text-white">{earnings.lifetimeEarned.toFixed(2)}</div>
              </div>
            </div>

            <Link
              href="/kekere/wallet/withdraw"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-white py-3 text-[14px] font-semibold text-[#176E48] transition-opacity hover:opacity-90"
            >
              {earnings.hasBankDetails ? "Withdraw to bank" : "Add bank details to withdraw"} <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Transparent split — a proportion bar, not just prose */}
        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
              Your split
            </span>
            <span className="text-[12px] font-semibold text-[var(--color-primary)]">{earnings.writerRatePercent}% to you</span>
          </div>
          <div className="mt-2.5 flex h-[10px] overflow-hidden rounded-full bg-[rgba(42,26,18,0.06)]">
            <div className="h-full" style={{ width: `${earnings.writerRatePercent}%`, backgroundColor: ORANGE }} />
            <div className="h-full" style={{ width: `${100 - earnings.writerRatePercent}%`, backgroundColor: "rgba(42,26,18,0.12)" }} />
          </div>
          <p className="mt-2.5 text-[12.5px] leading-[1.55] text-[var(--color-ink-muted)]">
            On a {exampleCost}-cowrie story, that&apos;s{" "}
            <strong className="text-[var(--color-ink)]">{exampleWriterShare.toFixed(2)} cowries</strong> to you — plus every
            tip in full.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[rgba(42,26,18,0.07)] pt-3">
            <StatBlock value={earnings.lifetimeFromUnlocks.toFixed(2)} label="From unlocks" />
            <StatBlock value={earnings.lifetimeFromTips.toFixed(2)} label="From tips" />
          </div>
        </Card>
      </section>

      {/* Overview */}
      <section className="mb-7">
        <SectionLabel>Overview</SectionLabel>
        <Card>
          <div className="flex items-center gap-4 border-b border-[rgba(42,26,18,0.07)] pb-4">
            <CompletionRing pct={overview.avgCompletionRate} />
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Average completion</p>
              <p className="mt-0.5 text-[12px] leading-[1.4] text-[var(--color-ink-muted-2)]">
                Share of readers who unlock a story and finish it, across every story you&apos;ve published.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-y-5">
            <StatBlock value={String(overview.publishedCount)} label="Published" />
            <StatBlock value={formatStat(overview.totalReads)} label="Reads" />
            <StatBlock
              value={overview.rating.average !== null ? overview.rating.average.toFixed(1) : "—"}
              label={overview.rating.count > 0 ? `Rating (${overview.rating.count})` : "No ratings yet"}
            />
            <StatBlock value={formatStat(overview.followerCount)} label="Followers" />
            <StatBlock value={String(overview.tipsReceivedCount)} label="Tips received" />
            <StatBlock value={`${followerDelta >= 0 ? "+" : ""}${followerDelta}`} label="Followers · 30d" />
          </div>
        </Card>
      </section>

      {/* Follower growth */}
      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <Users size={12} /> Followers · last 30 days
            </span>
          </SectionLabel>
          <span className={cn("text-[12px] font-semibold", followerDelta >= 0 ? "text-[#1F8A5B]" : "text-[#C0392B]")}>
            {followerDelta >= 0 ? "+" : ""}{followerDelta}
          </span>
        </div>
        <Card>
          <AreaSparkline data={followerSeries.map((p) => p.value)} color={ORANGE} gradientId="follower-area" />
        </Card>
      </section>

      {/* Earnings over time */}
      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <TrendingUp size={12} /> Earnings · last 30 days
            </span>
          </SectionLabel>
          <span className="text-[12px] font-semibold text-[#1F8A5B]">{earningsTotal.toFixed(2)} cowries</span>
        </div>
        <Card>
          <AreaSparkline data={earningsSeries.map((p) => p.value)} color={GREEN} gradientId="earnings-area" />
        </Card>
      </section>

      {/* Per-story breakdown */}
      <section>
        <SectionLabel>Your stories</SectionLabel>
        {stories.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={20} />}
            title="No published stories yet"
            note="Once a story goes live, its reads, completion rate, ratings, and tips will show up here."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {stories.map((story, i) => (
              <Card key={story.id} className="flex gap-3">
                <StoryCoverThumb coverColor={story.coverColor} coverImageRef={story.coverImageRef} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[14px] font-semibold text-[var(--color-ink)]">{story.title}</p>
                    {i === 0 && story.reads > 0 && (
                      <span className="flex-none rounded-full bg-[rgba(199,93,44,0.1)] px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">
                        Top
                      </span>
                    )}
                  </div>

                  {/* Relative reads bar — same reads figure, just given a
                      quick visual scale against this writer's best story. */}
                  <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-[rgba(42,26,18,0.06)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (story.reads / maxReads) * 100)}%`, backgroundColor: ORANGE }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-ink-muted-2)]">
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} /> {formatStat(story.reads)} reads
                    </span>
                    <span>{story.completionRate}% finish</span>
                    {story.rating.count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-current text-[var(--color-primary)]" /> {story.rating.average?.toFixed(1)}
                      </span>
                    )}
                    {story.tips > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart size={11} /> {story.tips}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
