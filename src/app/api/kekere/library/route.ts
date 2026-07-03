export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getUserLibrary } from "@/lib/data/kekere-library";

export const GET = withAuth(async (_request, session) => {
  const library = await getUserLibrary(session.user.id);
  return NextResponse.json(library);
});
