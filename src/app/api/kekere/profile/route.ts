export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateKekereProfile } from "@/lib/data/kekere-profile-stats";

export const PATCH = withAuth(async (request, session) => {
  const body = await request.json().catch(() => ({}));
  const { name, bio, socialLinks } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof bio !== "string") {
    return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
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

  const profile = await updateKekereProfile(session.user.id, {
    name: name.trim(),
    bio: bio.slice(0, 160),
    socialLinks: parsedSocialLinks,
  });

  return NextResponse.json(profile);
});
