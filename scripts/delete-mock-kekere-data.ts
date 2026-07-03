/**
 * One-off cleanup: deletes all mock Kekere stories and their seeded author
 * accounts from the database. Run ONCE after emptying MOCK_STORIES.
 *
 *   npx tsx scripts/delete-mock-kekere-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MOCK_STORY_IDS = [
  "the-last-bus-to-yaba",
  "jollof-wars",
  "what-the-okada-driver-saw",
  "her-mothers-tongue",
  "the-generator-diaries",
  "aunty-ngozis-last-wedding",
  "lagos-4am",
  "the-boy-who-counted-stars",
  "nkem-and-the-quiet-house",
  "three-calls-from-my-father",
  "the-wig-shop-on-allen-avenue",
  "what-we-buried-in-bonny",
  "love-logged-off",
  "the-interview",
  "salt-for-the-sea-widow",
];

async function main() {
  console.log("Deleting mock Kekere stories…");
  const { count: storiesDeleted } = await prisma.story.deleteMany({
    where: { id: { in: MOCK_STORY_IDS } },
  });
  console.log(`  Deleted ${storiesDeleted} stories (cascade removes unlocks, completions, progress).`);

  console.log("Deleting seeded Kekere author accounts…");
  const { count: usersDeleted } = await prisma.user.deleteMany({
    where: { email: { endsWith: "@kekere.seed" } },
  });
  console.log(`  Deleted ${usersDeleted} user accounts.`);

  console.log("Done.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
