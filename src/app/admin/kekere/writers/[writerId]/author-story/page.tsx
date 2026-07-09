import { prisma } from "@/lib/db/prisma";
import { AuthorStoryEditor } from "@/components/admin/author-story-editor";
import { notFound } from "next/navigation";

interface Props {
  params: { writerId: string };
}

export default async function Page({ params }: Props) {
  const writer = await prisma.user.findUnique({
    where: { id: params.writerId },
    select: { id: true, name: true },
  });

  if (!writer) notFound();

  return <AuthorStoryEditor writerId={writer.id} writerName={writer.name} />;
}
