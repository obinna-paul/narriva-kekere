import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { addSubmissionUpdate } from "@/lib/data/submissions";

const schema = z.object({ note: z.string().min(1).max(2000) });

export const POST = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update = await addSubmissionUpdate(params.id, parsed.data.note);
    return NextResponse.json({ update }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
