export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateKekereProfile } from "@/lib/data/kekere-profile-stats";
import { setKekereUsername } from "@/lib/data/kekere-username";
import { getValidatedComingSoonStory } from "@/lib/data/kekere-writer-profile";

export const PATCH = withAuth(async (request, session) => {
  const body = await request.json().catch(() => ({}));
  const { name, bio, socialLinks, country, currentlyWritingStoryId, crossPromotionEnabled, kekereUsername } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof bio !== "string") {
    return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
  }
  if (country !== undefined && country !== null && typeof country !== "string") {
    return NextResponse.json({ error: "Country must be a string" }, { status: 400 });
  }
  if (
    currentlyWritingStoryId !== undefined &&
    currentlyWritingStoryId !== null &&
    typeof currentlyWritingStoryId !== "string"
  ) {
    return NextResponse.json({ error: "currentlyWritingStoryId must be a string" }, { status: 400 });
  }
  if (crossPromotionEnabled !== undefined && typeof crossPromotionEnabled !== "boolean") {
    return NextResponse.json({ error: "crossPromotionEnabled must be a boolean" }, { status: 400 });
  }
  if (kekereUsername !== undefined && kekereUsername !== null && typeof kekereUsername !== "string") {
    return NextResponse.json({ error: "Username must be a string" }, { status: 400 });
  }

  // Never trust the client's word that a story is an eligible draft of
  // theirs — re-check ownership/status/word-count server-side, same as the
  // read-time validation the public profile itself relies on.
  if (currentlyWritingStoryId !== undefined && currentlyWritingStoryId !== null) {
    const validated = await getValidatedComingSoonStory(session.user.id, currentlyWritingStoryId);
    if (!validated) {
      return NextResponse.json({ error: "not_eligible" }, { status: 400 });
    }
  }

  let parsedSocialLinks: { label: string; href: string }[] | undefined;
  if (socialLinks !== undefined) {
    if (
      !Array.isArray(socialLinks) ||
      !socialLinks.every(
        (l) => l && typeof l.label === "string" && typeof l.href === "string",
      )
    ) {
      return NextResponse.json({ error: "Invalid social links" }, { status: 400 });
    }
    parsedSocialLinks = socialLinks.slice(0, 5);
  }

  // Username has its own uniqueness/format rules and a distinct error shape
  // the client needs to show inline ("that one's taken") — handled as its
  // own step rather than folded into the general profile update.
  if (kekereUsername !== undefined) {
    const trimmed = typeof kekereUsername === "string" ? kekereUsername.trim() : "";
    const result = await setKekereUsername(session.user.id, trimmed || null);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const profile = await updateKekereProfile(session.user.id, {
    name: name.trim(),
    bio: bio.slice(0, 280),
    socialLinks: parsedSocialLinks,
    country: typeof country === "string" ? country.trim().slice(0, 80) || null : undefined,
    currentlyWritingStoryId: currentlyWritingStoryId !== undefined ? currentlyWritingStoryId || null : undefined,
    crossPromotionEnabled: typeof crossPromotionEnabled === "boolean" ? crossPromotionEnabled : undefined,
  });

  return NextResponse.json(profile);
});
