import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateKekereProfile } from "@/lib/data/kekere-profile-stats";

export const PATCH = withAuth(async (request, session) => {
  const body = await request.json().catch(() => ({}));
  const { name, bio, bankName, bankAccountNumber, bankAccountName } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof bio !== "string") {
    return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
  }

  const profile = await updateKekereProfile(session.user.id, {
    name: name.trim(),
    bio: bio.slice(0, 160),
    bankName: typeof bankName === "string" ? bankName.trim() || null : undefined,
    bankAccountNumber: typeof bankAccountNumber === "string" ? bankAccountNumber.trim() || null : undefined,
    bankAccountName: typeof bankAccountName === "string" ? bankAccountName.trim() || null : undefined,
  });

  return NextResponse.json(profile);
});
