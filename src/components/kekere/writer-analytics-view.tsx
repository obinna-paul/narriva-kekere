import Link from "next/link";
import { ChevronLeft, ArrowRight, Star, Users, BookOpen, Heart } from "lucide-react";
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

/** Hand-rolled SVG sparkline, no chart library — same pattern as the admin
 *  Command Center's Sparkline component, restyled to Kekere's palette. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return (
      <div className="flex h-[60px] items-center justify-center text-[12px] text-[var(--color-ink-muted-3)]">
        Nothing yet this period
      </div>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 60;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 8) - 4}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoryCoverThumb({ coverColor, coverImageRef }: { coverColor: string; coverImageRef: string | null }) {
  return (
    <div
      className="relative h-[52px] w-[40px] flex-none overflow-hidden rounded-[6px]"
      style={{ backgroundColor: coverColor }}
    >
      {coverImageRef && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={storyCoverUrl(coverImageRef)} alt="" className="h-full w-full object-cover" loading="lazy" />
      )}
    </div>
  );
}

export function WriterAnalyticsView({ overview, earnings, earningsSeries, followerSeries, stories }: WriterAnalyticsViewProps) {
  const earningsTotal = earningsSeries.reduce((sum, p) => sum + p.value, 0);
  const followerDelta = followerSeries.length > 1 ? followerSeries[followerSeries.length - 1].value - followerSeries[0].value : 0;

  const exampleCost = 3;
  const exampleWriterShare = Math.round(exampleCost * (earnings.writerRatePercent / 100) * 100) / 100;

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
        <div className="overflow-hidden rounded-[20px] shadow-[0_6px_30px_rgba(42,26,18,0.12)]" style={{ background: "linear-gradient(135deg, #1F8A5B 0%, #176E48 100%)" }}>
          <div className="px-5 py-5">
            <span className="text-[13px] font-medium text-white/80">Available to withdraw</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-semibold text-white tracking-[-0.01em]">
              {earnings.available.toFixed(2)} <span className="text-[22px]">cowries</span>
            </div>
            <div className="mt-1 text-[14px] text-white/70">~&#8358;{(earnings.available * NAIRA_RATE).toLocaleString()}</div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <div>
                <div className="text-[11px] text-white/60">Pending withdrawal</div>
                <div className="mt-0.5 text-[15px] font-semibold text-white">{earnings.pending.toFixed(2)}</div>
                {earnings.activeWithdrawal && (
                  <div className="mt-0.5 text-[10.5px] text-white/60">
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

        {/* Transparent split */}
        <Card className="mt-3">
          <p className="text-[13px] leading-[1.55] text-[var(--color-ink-muted)]">
            You keep <strong className="text-[var(--color-ink)]">{earnings.writerRatePercent}%</strong> of every unlock,
            plus every tip in full. On a {exampleCost}-cowrie story, that&apos;s{" "}
            <strong className="text-[var(--color-ink)]">{exampleWriterShare.toFixed(2)} cowries</strong> to you.
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
          <div className="grid grid-cols-3 gap-y-5">
            <StatBlock value={String(overview.publishedCount)} label="Published" />
            <StatBlock value={formatStat(overview.totalReads)} label="Reads" />
            <StatBlock value={overview.avgCompletionRate !== null ? `${overview.avgCompletionRate}%` : "—"} label="Completion" />
            <StatBlock
              value={overview.rating.average !== null ? overview.rating.average.toFixed(1) : "—"}
              label={overview.rating.count > 0 ? `Rating (${overview.rating.count})` : "No ratings yet"}
            />
            <StatBlock value={formatStat(overview.followerCount)} label="Followers" />
            <StatBlock value={String(overview.tipsReceivedCount)} label="Tips received" />
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
          <Sparkline data={followerSeries.map((p) => p.value)} color="#C75D2C" />
        </Card>
      </section>

      {/* Earnings over time */}
      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <SectionLabel>Earnings · last 30 days</SectionLabel>
          <span className="text-[12px] font-semibold text-[#1F8A5B]">{earningsTotal.toFixed(2)} cowries</span>
        </div>
        <Card>
          <Sparkline data={earningsSeries.map((p) => p.value)} color="#1F8A5B" />
        </Card>
      </section>

      {/* Per-story breakdown */}
      <section>
        <SectionLabel>Your stories</SectionLabel>
        {stories.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-[13px] text-[var(--color-ink-muted-2)]">
              Publish a story to see its stats here.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {stories.map((story) => (
              <Card key={story.id} className="flex gap-3">
                <StoryCoverThumb coverColor={story.coverColor} coverImageRef={story.coverImageRef} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[var(--color-ink)]">{story.title}</p>
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
