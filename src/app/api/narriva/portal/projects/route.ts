export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAuthorProjects } from "@/lib/data/kekere-portal";

export const GET = withAuth(async (_request, session) => {
  const projects = await getAuthorProjects(session.user.id);
  return NextResponse.json({ projects });
});
