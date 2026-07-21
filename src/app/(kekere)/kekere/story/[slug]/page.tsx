import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { StoryReader } from "@/components/kekere/story-reader";
import { getStoryForReader, getStoryBySlugOrId } from "@/lib/data/kekere-stories";
import { isStorySaved } from "@/lib/data/kekere-library";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getStoryRating } from "@/lib/data/kekere-ratings";
import { isFollowing } from "@/lib/data/kekere-follows";
import { getNoteEligibilityForStory } from "@/lib/data/kekere-notes";
import { getOrCreateReferralCodeForUser } from "@/lib/data/kekere-referrals";
import { toReaderStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { storyCoverOgImageUrl } from "@/lib/storage/cloudinary";
import { JsonLd } from "@/components/seo/json-ld";
import { creativeWorkSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const resolved = await getStoryBySlugOrId(params.slug);
  const story = resolved?.story;
  // Only ever emit rich metadata for live, publicly-readable stories — a
  // leaked draft/review-queue link shouldn't pick up indexing signals.
  if (!story || story.status !== "PUBLISHED") return {};

  // Always point canonical/OG at the real slug URL, even when this request
  // came in on a legacy id link — the page component redirects that case,
  // but metadata for the id-URL response should already say where the
  // canonical copy lives.
  const canonicalPath = `/kekere/story/${story.slug ?? story.id}`;

  const ogImage = story.coverImageRef
    ? storyCoverOgImageUrl(story.coverImageRef)
    : `/api/og?brand=kekere&title=${encodeURIComponent(story.title)}&subtitle=${encodeURIComponent(
        `by ${story.author.name}`
      )}&color=${encodeURIComponent(story.coverColor)}`;

  return {
    title: story.title,
    description: story.hookLine,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: story.title,
      description: story.hookLine,
      url: canonicalPath,
      type: "article",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description: story.hookLine,
    },
  };
}

export default async function KekereStoryPage({ params }: { params: { slug: string } }) {
  const resolved = await getStoryBySlugOrId(params.slug);
  if (!resolved) notFound();

  // A shared/indexed link from before slugs existed (or any other bare-id
  // access) — send it to the canonical slug URL rather than rendering here,
  // so every reader and every crawler converges on one real address per story.
  if (resolved.matchedBy === "id" && resolved.story.slug) {
    permanentRedirect(`/kekere/story/${resolved.story.slug}`);
  }

  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const dbStory = await getStoryForReader(resolved.story.id, userId);
  if (!dbStory) notFound();

  const [saved, wallet, rating, following, noteEligibility, referralCode, authorExtra] = await Promise.all([
    userId ? isStorySaved(userId, dbStory.id) : Promise.resolve(false),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getStoryRating(userId, dbStory.id) : Promise.resolve(null),
    userId ? isFollowing(userId, dbStory.author.id) : Promise.resolve(false),
    userId ? getNoteEligibilityForStory(userId, dbStory.id) : Promise.resolve({ eligible: false, alreadySent: false }),
    userId ? getOrCreateReferralCodeForUser(userId) : Promise.resolve(null),
    // Country isn't part of the shared story author-include; grab it here so
    // the finish overlay's "Meet the writer" card reads like a real profile.
    prisma.user.findUnique({ where: { id: dbStory.author.id }, select: { country: true } }),
  ]);

  const canonicalPath = `/kekere/story/${dbStory.slug ?? dbStory.id}`;

  return (
    <KekereTheme>
      <JsonLd
        data={creativeWorkSchema({
          id: dbStory.id,
          slug: dbStory.slug,
          title: dbStory.title,
          hookLine: dbStory.hookLine,
          genre: dbStory.genre,
          wordCount: dbStory.wordCount,
          publishedAt: dbStory.publishedAt,
          author: { name: dbStory.author.name, slug: dbStory.author.slug },
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Kekere Stories", path: "/kekere" },
          { name: dbStory.title, path: canonicalPath },
        ])}
      />
      <StoryReader
        story={toReaderStoryData(dbStory)}
        isLoggedIn={!!userId}
        initialUnlocked={dbStory.unlocked}
        initialBalance={wallet?.spendingBalance ?? 0}
        initialSaved={saved}
        initialRating={rating ?? undefined}
        firstReadFree={dbStory.firstReadFree}
        initialFollowing={following}
        isOwnStory={userId === dbStory.author.id}
        noteEligible={noteEligibility.eligible}
        noteAlreadySent={noteEligibility.alreadySent}
        referralCode={referralCode}
        authorCountry={authorExtra?.country ?? null}
      />
    </KekereTheme>
  );
}
