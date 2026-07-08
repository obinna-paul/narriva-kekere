import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { StoryReader } from "@/components/kekere/story-reader";
import { getStoryForReader, getStoryById } from "@/lib/data/kekere-stories";
import { isStorySaved } from "@/lib/data/kekere-library";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getStoryRating } from "@/lib/data/kekere-ratings";
import { toReaderStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { storyCoverOgImageUrl } from "@/lib/storage/cloudinary";
import { JsonLd } from "@/components/seo/json-ld";
import { creativeWorkSchema, breadcrumbSchema } from "@/lib/seo/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const story = await getStoryById(params.id);
  // Only ever emit rich metadata for live, publicly-readable stories — a
  // leaked draft/review-queue ID shouldn't pick up indexing signals.
  if (!story || story.status !== "PUBLISHED") return {};

  const ogImage = story.coverImageRef
    ? storyCoverOgImageUrl(story.coverImageRef)
    : `/api/og?brand=kekere&title=${encodeURIComponent(story.title)}&subtitle=${encodeURIComponent(
        `by ${story.author.name}`
      )}&color=${encodeURIComponent(story.coverColor)}`;

  return {
    title: story.title,
    description: story.hookLine,
    alternates: { canonical: `/kekere/story/${story.id}` },
    openGraph: {
      title: story.title,
      description: story.hookLine,
      url: `/kekere/story/${story.id}`,
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

export default async function KekereStoryPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const dbStory = await getStoryForReader(params.id, userId);
  if (!dbStory) notFound();

  const [saved, wallet, rating] = await Promise.all([
    userId ? isStorySaved(userId, params.id) : Promise.resolve(false),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getStoryRating(userId, params.id) : Promise.resolve(null),
  ]);

  return (
    <KekereTheme>
      <JsonLd
        data={creativeWorkSchema({
          id: dbStory.id,
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
          { name: dbStory.title, path: `/kekere/story/${dbStory.id}` },
        ])}
      />
      <StoryReader
        story={toReaderStoryData(dbStory)}
        isLoggedIn={!!userId}
        userEmail={session?.user?.email ?? undefined}
        initialUnlocked={dbStory.unlocked}
        initialBalance={wallet?.spendingBalance ?? 0}
        initialSaved={saved}
        initialRating={rating ?? undefined}
        firstReadFree={dbStory.firstReadFree}
      />
    </KekereTheme>
  );
}
