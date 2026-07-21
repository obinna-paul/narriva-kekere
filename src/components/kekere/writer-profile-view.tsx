import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { storyCoverUrl, userAvatarUrl } from "@/lib/storage/cloudinary-urls";
import { WriterFollowHeader } from "@/components/kekere/writer-follow-header";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import type { PublicWriterProfile, WriterProfileStats, WriterProfileStory } from "@/lib/data/kekere-writer-profile";

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

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-3 py-[18px] text-center">
      <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-none text-[var(--color-primary)]">
        {value}
      </div>
      <div className="mt-1 text-[11.5px] leading-[1.3] text-[var(--color-ink-muted-2)]">{label}</div>
    </div>
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

export interface WriterProfileViewProps {
  profile: PublicWriterProfile;
  stats: WriterProfileStats;
  stories: WriterProfileStory[];
  followerCount: number;
  viewerIsLoggedIn: boolean;
  viewerIsFollowing: boolean;
  isOwnProfile: boolean;
}

export function WriterProfileView({
  profile,
  stats,
  stories,
  followerCount,
  viewerIsLoggedIn,
  viewerIsFollowing,
  isOwnProfile,
}: WriterProfileViewProps) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  const avatarUrl = profile.avatar ? userAvatarUrl(profile.avatar) : null;
  const avatarColor = profile.avatarColor ?? "#C75D2C";

  return (
    <div className="mx-auto max-w-[560px] pb-[64px]">
      <section className="px-[22px] pb-[30px] pt-[44px] text-center">
        <div
          className="mx-auto flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full p-1"
          style={{ background: avatarColor }}
        >
          <div
            className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[34px] font-semibold text-white"
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
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[26px] font-semibold text-[var(--color-ink)]">
          {profile.name}
        </h1>
        {profile.country && (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[13px] text-[var(--color-ink-muted-2)]">
            <MapPin size={13} /> Writer from {profile.country}
          </p>
        )}
        {profile.bio && (
          <p className="mx-auto mt-2 max-w-[340px] text-[14.5px] leading-[1.5] text-[var(--color-ink-muted)]">
            {profile.bio}
          </p>
        )}

        {profile.socialLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-[8px]">
            {profile.socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[rgba(42,26,18,0.12)] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        <p className="mt-3 text-[12px] text-[var(--color-ink-muted-3)]">
          Member since {formatMemberSince(profile.memberSince)}
        </p>

        <WriterFollowHeader
          writerId={profile.id}
          isLoggedIn={viewerIsLoggedIn}
          initialFollowing={viewerIsFollowing}
          initialFollowerCount={followerCount}
          isOwnProfile={isOwnProfile}
        />
      </section>

      <section className="px-[22px]">
        <div className="mb-8 grid grid-cols-3 gap-[10px]">
          <StatTile value={String(stats.publishedCount)} label={stats.publishedCount === 1 ? "Story" : "Stories"} />
          <StatTile value={formatCount(stats.totalReads)} label="Reads" />
          <StatTile
            value={stats.rating.average !== null ? stats.rating.average.toFixed(1) : "—"}
            label={stats.rating.count > 0 ? `${stats.rating.count} rating${stats.rating.count === 1 ? "" : "s"}` : "No ratings yet"}
          />
        </div>

        <h2 className={cn("mb-3 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]")}>
          Published stories
        </h2>
        <div className="flex flex-col gap-2.5">
          {stories.map((story) => (
            <StoryListItem key={story.id} story={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
