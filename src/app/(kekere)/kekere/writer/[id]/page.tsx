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
} from "@/lib/data/kekere-writer-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getPublicWriterProfile(params.id);
  if (result.kind !== "writer") return {};

  const { profile } = result;
  return {
    title: profile.name,
    description: profile.bio || `Stories by ${profile.name} on Kekere Stories.`,
    alternates: { canonical: `/kekere/writer/${profile.id}` },
    openGraph: {
      title: profile.name,
      description: profile.bio || `Stories by ${profile.name} on Kekere Stories.`,
      url: `/kekere/writer/${profile.id}`,
      type: "profile",
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
  const [stats, stories] = await Promise.all([
    getWriterProfileStats(params.id),
    getWriterPublishedStories(params.id),
  ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <WriterProfileView profile={profile} stats={stats} stories={stories} />
      </div>
    </KekereTheme>
  );
}
