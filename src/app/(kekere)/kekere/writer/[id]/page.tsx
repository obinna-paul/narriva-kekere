import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WriterProfileView } from "@/components/kekere/writer-profile-view";
import {
  getPublicWriterProfile,
  getWriterProfileStats,
  getWriterPublishedStories,
  getSimilarWriters,
} from "@/lib/data/kekere-writer-profile";
import { getFollowerCount, isFollowing, getRecentFollowerAvatars } from "@/lib/data/kekere-follows";
import { getPraiseWallNotes } from "@/lib/data/kekere-notes";
import { getCurrentSession } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getPublicWriterProfile(params.id);
  if (result.kind !== "writer") return {};

  const { profile } = result;
  // Prefer the vanity handle once one's set — that's the URL meant to be
  // shared, so it's the canonical one search engines and link previews
  // should see, even though the raw id keeps resolving forever too.
  const path = `/kekere/writer/${profile.kekereUsername ?? profile.id}`;
  const description = profile.bio || `Stories by ${profile.name} on Kekere Stories.`;
  return {
    title: profile.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: profile.name,
      description,
      url: path,
      type: "profile",
      images: [{ url: `/api/kekere/writers/${profile.id}/card` }],
    },
  };
}

export default async function KekereWriterProfilePage({ params }: { params: { id: string } }) {
  const result = await getPublicWriterProfile(params.id);

  if (result.kind === "not_found") notFound();

  if (result.kind === "not_a_writer") {
    return (
      <KekereTheme>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
          <KekereNavWrapper />
          <div className="mx-auto flex max-w-[420px] flex-col items-center px-[22px] pb-[64px] pt-[88px] text-center">
            <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--color-ink)]">
              No public profile yet
            </h1>
            <p className="mt-3 text-[14.5px] leading-[1.55] text-[var(--color-ink-muted)]">
              {result.name} hasn&apos;t published a story on Kekere. Only writers with a published story have a
              visitable profile.
            </p>
            <Link
              href="/kekere/feed"
              className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-[10px] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              Back to the feed
            </Link>
          </div>
        </div>
      </KekereTheme>
    );
  }

  const { profile } = result;
  // Every downstream lookup below needs the real user id — params.id may
  // actually be a kekereUsername, which getPublicWriterProfile already
  // resolved for us. Using params.id directly here would silently return
  // empty results for anyone visiting via their pretty URL.
  const writerId = profile.id;
  const session = await getCurrentSession();
  const viewerId = session?.user?.id;

  const [stats, stories, followerCount, viewerIsFollowing, followerAvatars, praiseWallNotes, similarWriters] =
    await Promise.all([
      getWriterProfileStats(writerId),
      getWriterPublishedStories(writerId),
      getFollowerCount(writerId),
      viewerId ? isFollowing(viewerId, writerId) : Promise.resolve(false),
      getRecentFollowerAvatars(writerId),
      getPraiseWallNotes(writerId),
      profile.crossPromotionEnabled ? getSimilarWriters(writerId) : Promise.resolve([]),
    ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <WriterProfileView
          profile={profile}
          stats={stats}
          stories={stories}
          followerCount={followerCount}
          followerAvatars={followerAvatars}
          praiseWallNotes={praiseWallNotes}
          similarWriters={similarWriters}
          viewerIsLoggedIn={!!viewerId}
          viewerIsFollowing={viewerIsFollowing}
          isOwnProfile={viewerId === profile.id}
        />
      </div>
    </KekereTheme>
  );
}
