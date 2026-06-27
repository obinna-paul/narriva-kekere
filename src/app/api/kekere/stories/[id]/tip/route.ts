import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { tipWriter } from "@/lib/data/kekere-tips";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  try {
    const result = await tipWriter(session.user.id, params.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tip failed";
    const status =
      message === "Not enough cowries" ? 402 : message === "Cannot tip yourself" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
