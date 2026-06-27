import { prisma } from "@/lib/db/prisma";

export interface KekereLandingStats {
  storyCount: number;
  writerCount: number;
}

export async function getKekereLandingStats(): Promise<KekereLandingStats> {
  const [storyCount, distinctAuthors] = await Promise.all([
    prisma.story.count({ where: { status: "PUBLISHED" } }),
    prisma.story.groupBy({ by: ["authorId"], where: { status: "PUBLISHED" } }),
  ]);

  return { storyCount, writerCount: distinctAuthors.length };
}

export interface FeaturedWriter {
  id: string;
  name: string;
  avatarColor: string | null;
  storyCount: number;
}

/** Top writers by published story count — backs "The Circle" row on the
 * landing page. Falls back gracefully (empty array) before anyone has
 * published anything. */
export async function getFeaturedWriters(limit = 6): Promise<FeaturedWriter[]> {
  const grouped = await prisma.story.groupBy({
    by: ["authorId"],
    where: { status: "PUBLISHED" },
    _count: { authorId: true },
    orderBy: { _count: { authorId: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  const authors = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.authorId) } },
    select: { id: true, name: true, avatarColor: true },
  });
  const authorById = new Map(authors.map((a) => [a.id, a]));

  return grouped
    .map((g) => {
      const author = authorById.get(g.authorId);
      if (!author) return null;
      return {
        id: author.id,
        name: author.name,
        avatarColor: author.avatarColor,
        storyCount: g._count.authorId,
      };
    })
    .filter((w): w is FeaturedWriter => w !== null);
}
