import { notFound } from "next/navigation";
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
  const profile = await getPublicWriterProfile(params.id);
  if (!profile) return {};

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
  const profile = await getPublicWriterProfile(params.id);
  if (!profile) notFound();

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
