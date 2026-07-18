export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { followWriter, unfollowWriter, isFollowing, getFollowerCount } from "@/lib/data/kekere-follows";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const result = await followWriter(session.user.id, params.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ following: true, followerCount: result.followerCount });
});

export const DELETE = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const result = await unfollowWriter(session.user.id, params.id);
  return NextResponse.json({ following: false, followerCount: result.followerCount });
});

export const GET = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const [following, followerCount] = await Promise.all([
    isFollowing(session.user.id, params.id),
    getFollowerCount(params.id),
  ]);
  return NextResponse.json({ following, followerCount });
});
