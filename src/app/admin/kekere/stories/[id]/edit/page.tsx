import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { storyCoverUrl } from "@/lib/storage/cloudinary";
import { AdminStoryEditor } from "@/components/admin/admin-story-editor";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

export const dynamic = "force-dynamic";

export default async function AdminEditStoryPage({ params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      hookLine: true,
      body: true,
      tier: true,
      cowrieCost: true,
      isAdult: true,
      coverImageRef: true,
      status: true,
      lastSavedAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true } },
      tags: { select: { tag: { select: { id: true, slug: true, label: true } } } },
    },
  });

  if (!story) notFound();

  return (
    <AdminStoryEditor
      storyId={story.id}
      authorName={story.author.name}
      status={story.status}
      initial={{
        title: story.title,
        hookLine: story.hookLine,
        body: story.body as unknown as TiptapDoc,
        tier: story.tier,
        cowrieCost: story.cowrieCost,
        isAdult: story.isAdult,
        coverImageRef: story.coverImageRef,
        coverPreviewUrl: story.coverImageRef ? storyCoverUrl(story.coverImageRef) : null,
        tagIds: story.tags.map((t) => t.tag.id),
        lastSavedAt: (story.lastSavedAt ?? story.updatedAt).toISOString(),
      }}
    />
  );
}
