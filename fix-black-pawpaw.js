#!/usr/bin/env node

/**
 * Fix Black Pawpaw story tag to "literary"
 *
 * Usage:
 *   DATABASE_URL="your_connection_string" node fix-black-pawpaw.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Looking for Black Pawpaw story...");
    const story = await prisma.story.findFirst({
      where: { title: "Black Pawpaw" },
      select: { id: true, title: true },
    });

    if (!story) {
      console.error("❌ Story not found");
      process.exit(1);
    }

    console.log(`✓ Found: ${story.title} (${story.id})`);

    console.log("\n🔍 Looking for 'literary' tag...");
    const literaryTag = await prisma.tag.findUnique({
      where: { slug: "literary" },
      select: { id: true, slug: true },
    });

    if (!literaryTag) {
      console.error("❌ Literary tag not found");
      process.exit(1);
    }

    console.log(`✓ Found: ${literaryTag.slug} (${literaryTag.id})`);

    console.log("\n🗑️  Removing old tags...");
    const deleted = await prisma.storyTag.deleteMany({
      where: { storyId: story.id },
    });
    console.log(`✓ Deleted ${deleted.count} old tag(s)`);

    console.log("\n➕ Adding literary tag...");
    const created = await prisma.storyTag.create({
      data: {
        storyId: story.id,
        tagId: literaryTag.id,
      },
      select: { storyId: true, tagId: true },
    });
    console.log(`✓ Tag assigned`);

    console.log("\n✅ Success! Black Pawpaw is now tagged as 'Literary'");
    console.log("📝 Refresh your feed to see the change.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
