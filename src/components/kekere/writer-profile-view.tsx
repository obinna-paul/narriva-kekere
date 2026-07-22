"use client";

import Link from "next/link";
import { MapPin, Star, Quote, Users, BookOpen, Heart } from "lucide-react";
import { storyCoverUrl, userAvatarUrl } from "@/lib/storage/cloudinary-urls";
import { WriterFollowHeader } from "@/components/kekere/writer-follow-header";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import type {
  PublicWriterProfile,
  WriterProfileStats,
  WriterProfileStory,
  SimilarWriter,
} from "@/lib/data/kekere-writer-profile";
import type { PraiseWallNote } from "@/lib/data/kekere-notes";
import type { FollowerAvatar } from "@/lib/data/kekere-follows";

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1)}k`;
  }
  return n.toString();
}

function formatMemberSince(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

function RatingLine({ average, count }: { average: number | null; count: number }) {
  if (average === null || count === 0) {
    return <span className="text-[var(--color-ink-muted-3)]">No ratings yet</span>;
  }
  return (
    <span className="flex items-center gap-1 font-semibold text-[var(--color-primary)]">
      <Star size={13} className="fill-current" />
      {average.toFixed(1)} <span className="font-normal text-[var(--color-ink-muted-2)]">· {count} rating{count === 1 ? "" : "s"}</span>
    </span>
  );
}

function StoryListItem({ story }: { story: WriterProfileStory }) {
  return (
    <Link
      href={`/kekere/story/${story.slug ?? story.id}`}
      className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-primary)]/40"
    >
      <div
        className="relative h-[86px] w-[64px] flex-none overflow-hidden rounded-lg"
        style={{ backgroundColor: story.coverColor }}
      >
        {story.coverImageRef && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storyCoverUrl(story.coverImageRef)} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        {story.isAdult && <MatureBadge className="absolute right-[4px] top-[4px] px-[4px] py-[1px] text-[7.5px]" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-[15px] font-semibold leading-snug text-[var(--color-ink)]">{story.title}</h3>
          {story.mostPopular && (
            <span className="whitespace-nowrap rounded-full bg-[var(--color-primary-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-light)]">
              Most popular
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-[var(--color-ink-muted)]">{story.hookLine}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--color-ink-muted-2)]">
          <RatingLine average={story.rating.average} count={story.rating.count} />
          <span>·</span>
          <span>{formatCount(story.reads)} read{story.reads === 1 ? "" : "s"}</span>
          <span>·</span>
          <span>{story.readingTime} min</span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section divider — a thin, warm, decorative line that sections the profile
// into visual chapters without being harsh.
// ---------------------------------------------------------------------------
function SectionDivider() {
  return (
    <div className="flex items-center gap-3 px-[22px]">
      <div className="h-px flex-1 bg-[rgba(42,26,18,0.08)]" />
      <div className="h-1 w-1 rounded-full bg-[var(--color-primary)]/30" />
      <div className="h-px flex-1 bg-[rgba(42,26,18,0.08)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats strip — a single horizontal bar that replaces the old three-tile grid.
// Four key metrics with icons, large numbers, and small labels, separated by
// thin vertical rules. Feels editorial, like a magazine's author sidebar.
// ---------------------------------------------------------------------------
function StatsStrip({
  stories,
  reads,
  followers,
  rating,
  ratingCount,
}: {
  stories: number;
  reads: number;
  followers: number;
  rating: number | null;
  ratingCount: number;
}) {
  return (
    <div className="mx-[22px] flex items-stretch overflow-hidden rounded-2xl border border-[rgba(42,26,18,0.08)] bg-[linear-gradient(175deg,#FFFFFF,#FDF8F3)]">
      <StatItem icon={<BookOpen size={15} />} value={String(stories)} label={stories === 1 ? "Story" : "Stories"} />
      <div className="w-px self-stretch bg-[rgba(42,26,18,0.07)]" />
      <StatItem icon={<Heart size={15} />} value={formatCount(reads)} label="Reads" />
      <div className="w-px self-stretch bg-[rgba(42,26,18,0.07)]" />
      <StatItem icon={<Users size={15} />} value={formatCount(followers)} label="Followers" />
      <div className="w-px self-stretch bg-[rgba(42,26,18,0.07)]" />
      <StatItem
        icon={<Star size={15} />}
        value={rating !== null ? rating.toFixed(1) : "—"}
        label={ratingCount > 0 ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}` : "No ratings"}
      />
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-4">
      <span className="mb-1 text-[var(--color-ink-muted-2)]">{icon}</span>
      <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold leading-none text-[var(--color-ink)]">
        {value}
      </span>
      <span className="mt-1 text-[10.5px] leading-tight text-[var(--color-ink-muted-2)]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Praise wall card — completely redesigned. No longer a horizontal-scroll
// wide card; now a full-width vertical card with a left accent stripe,
// reader avatar, quote-text, and a linked story attribution. The wall
// is built card by card so they read like a gallery of gratitude.
// ---------------------------------------------------------------------------
function PraiseWallCard({ note }: { note: PraiseWallNote }) {
  const initial = note.fromUserName.trim().charAt(0).toUpperCase() || "?";
  const avatarColor = note.fromUserAvatarColor ?? "#C75D2C";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgba(42,26,18,0.08)] bg-white">
      {/* Left accent stripe */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[4px] rounded-l-2xl opacity-60"
        style={{ background: `linear-gradient(180deg, ${avatarColor}00, ${avatarColor}44, ${avatarColor}00)` }}
      />

      {/* Top: reader identity */}
      <Link
        href={`/kekere/story/${note.storySlug ?? note.storyId}`}
        className="flex items-center gap-3 px-5 pt-4"
      >
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] font-bold text-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          style={{ background: `linear-gradient(135deg, #E08A4A, ${avatarColor})` }}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--color-ink)]">{note.fromUserName}</p>
          <p className="text-[11px] text-[var(--color-ink-muted-3)]">a reader</p>
        </div>
        <Quote size={14} className="flex-none text-[var(--color-primary)]/20" />
      </Link>

      {/* Middle: the note */}
      <p className="relative px-5 py-3 font-[family-name:var(--font-display)] text-[14.5px] italic leading-[1.6] text-[var(--color-ink)]">
        {note.body}
      </p>

      {/* Bottom: linked story attribution */}
      <Link
        href={`/kekere/story/${note.storySlug ?? note.storyId}`}
        className="flex items-center gap-1.5 border-t border-[rgba(42,26,18,0.06)] px-5 py-3 text-[12px] text-[var(--color-ink-muted-2)] transition-colors hover:bg-[var(--color-cream)]/60"
      >
        <BookOpen size={12} className="flex-none text-[var(--color-primary)]/70" />
        <span className="truncate">
          left on <span className="font-semibold text-[var(--color-ink)]">&ldquo;{note.storyTitle}&rdquo;</span>
        </span>
      </Link>
    </div>
  );
}

function SimilarWriterCard({ writer }: { writer: SimilarWriter }) {
  const initial = writer.name.trim().charAt(0).toUpperCase() || "?";
  const avatarUrl = writer.avatar ? userAvatarUrl(writer.avatar) : null;
  const avatarColor = writer.avatarColor ?? "#C75D2C";
  return (
    <Link
      href={`/kekere/writer/${writer.kekereUsername ?? writer.id}`}
      className="flex w-[150px] flex-none flex-col items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center transition-colors hover:border-[var(--color-primary)]/40"
    >
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-[20px] font-semibold text-white"
        style={{ background: `linear-gradient(135deg, #E08A4A, ${avatarColor})` }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <p className="mt-2.5 truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{writer.name}</p>
      {writer.topStoryTitle && (
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[var(--color-ink-muted-2)]">
          {writer.topStoryTitle}
        </p>
      )}
    </Link>
  );
}

export interface WriterProfileViewProps {
  profile: PublicWriterProfile;
  stats: WriterProfileStats;
  stories: WriterProfileStory[];
  followerCount: number;
  followerAvatars: FollowerAvatar[];
  praiseWallNotes: PraiseWallNote[];
  similarWriters: SimilarWriter[];
  viewerIsLoggedIn: boolean;
  viewerIsFollowing: boolean;
  isOwnProfile: boolean;
}

export function WriterProfileView({
  profile,
  stats,
  stories,
  followerCount,
  followerAvatars,
  praiseWallNotes,
  similarWriters,
  viewerIsLoggedIn,
  viewerIsFollowing,
  isOwnProfile,
}: WriterProfileViewProps) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  const avatarUrl = profile.avatar ? userAvatarUrl(profile.avatar) : null;
  const avatarColor = profile.avatarColor ?? "#C75D2C";
  const hasMeta = !!(profile.country || profile.memberSince);
  const hasBio = !!(profile.bio && profile.bio.trim());
  const hasComingSoon = !!profile.comingSoon;

  return (
    <div className="mx-auto max-w-[560px] pb-[80px]">
      {/* ================================================================ */}
      {/* HERO — avatar, name, meta, bio, socials, follow                  */}
      {/* ================================================================ */}
      <section className="px-[22px] pb-6 pt-[52px] text-center">
        {/* Avatar — larger, with an outer glow ring */}
        <div className="mx-auto flex h-[112px] w-[112px] items-center justify-center rounded-full p-[3px] shadow-[0_0_0_5px_rgba(199,93,44,0.06),0_4px_24px_rgba(42,26,18,0.1)]" style={{ background: avatarColor }}>
          <div
            className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[38px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, #E08A4A, ${avatarColor})` }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-[-0.3px] text-[var(--color-ink)]">
          {profile.name}
        </h1>

        {/* Meta line — country + member since, with a subtle dot separator */}
        {hasMeta && (
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[13px] text-[var(--color-ink-muted-2)]">
            {profile.country && (
              <>
                <MapPin size={12} className="text-[var(--color-primary)]/70" />
                {profile.country}
              </>
            )}
            {profile.country && profile.memberSince && (
              <span className="text-[var(--color-ink-muted-3)]">·</span>
            )}
            {profile.memberSince && (
              <span>Member since {formatMemberSince(profile.memberSince)}</span>
            )}
          </p>
        )}

        {/* Bio — with more breathing room */}
        {hasBio && (
          <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[1.6] text-[var(--color-ink-muted)]">
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {profile.socialLinks.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            {profile.socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[rgba(42,26,18,0.10)] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-[var(--color-primary)]/40 hover:shadow-[0_1px_4px_rgba(199,93,44,0.1)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Follow button + follower preview */}
        <div className="mt-4">
          <WriterFollowHeader
            writerId={profile.id}
            isLoggedIn={viewerIsLoggedIn}
            initialFollowing={viewerIsFollowing}
            initialFollowerCount={followerCount}
            isOwnProfile={isOwnProfile}
            followerAvatars={followerAvatars}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/* STATS STRIP                                                      */}
      {/* ================================================================ */}
      <div className="mb-8">
        <StatsStrip
          stories={stats.publishedCount}
          reads={stats.totalReads}
          followers={followerCount}
          rating={stats.rating.average}
          ratingCount={stats.rating.count}
        />
      </div>

      {/* ================================================================ */}
      {/* COMING SOON — moved up, before published stories                 */}
      {/* ================================================================ */}
      {hasComingSoon && (
        <section className="mb-8 px-[22px]">
          <div className="overflow-hidden rounded-2xl border border-[rgba(199,93,44,0.18)] bg-gradient-to-br from-[var(--color-primary-muted)] via-[var(--color-cream)] to-[var(--color-primary-muted)] p-5 shadow-[0_8px_24px_-10px_rgba(199,93,44,0.25)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]/70">
              Coming soon
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-[19px] font-bold leading-tight text-[var(--color-ink)]">
              {profile.comingSoon.title}
            </h3>
            {profile.comingSoon.hookLine && (
              <p className="mt-2 text-[14px] italic leading-[1.55] text-[var(--color-ink-muted)]">
                {profile.comingSoon.hookLine}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* PUBLISHED STORIES — kept as-is per user request                  */}
      {/* ================================================================ */}
      <section className="px-[22px]">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
          Published stories
        </h2>
        <div className="flex flex-col gap-2.5">
          {stories.map((story) => (
            <StoryListItem key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* PRAISE WALL — redesigned stacked testimonial cards               */}
      {/* ================================================================ */}
      {praiseWallNotes.length > 0 && (
        <>
          <div className="my-10">
            <SectionDivider />
          </div>

          <section className="px-[22px]">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                <Heart size={13} className="text-[var(--color-primary)]" />
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
                What readers say
              </h2>
              <span className="ml-auto rounded-full bg-[var(--color-primary-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                {praiseWallNotes.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {praiseWallNotes.map((note) => (
                <PraiseWallCard key={note.id} note={note} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* ================================================================ */}
      {/* SIMILAR WRITERS                                                  */}
      {/* ================================================================ */}
      {profile.crossPromotionEnabled && similarWriters.length > 0 && (
        <>
          <div className="my-10">
            <SectionDivider />
          </div>

          <section>
            <h2 className="mb-3 flex items-center gap-2 px-[22px] font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
              <Users size={16} className="text-[var(--color-primary)]" />
              Writers you might like
            </h2>
            <div className="scrollx flex gap-3 overflow-x-auto px-[22px] pb-1">
              {similarWriters.map((writer) => (
                <SimilarWriterCard key={writer.id} writer={writer} />
              ))}
            </div>
          </section>
        </>
      )}

      {/*
        Message count badge — not wired up yet.
        Kept commented out for when the feature is launched.
        {stats.unreadMessages > 0 && (
          <div className="px-[22px] mt-4">
            <Link href="/kekere/notes" className="flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-2.5 text-[13px] font-semibold text-[var(--color-primary)]">
              <MessageCircle size={14} />
              {stats.unreadMessages} new note{stats.unreadMessages === 1 ? '' : 's'} from readers
            </Link>
          </div>
        )}
      */}
    </div>
  );
}
