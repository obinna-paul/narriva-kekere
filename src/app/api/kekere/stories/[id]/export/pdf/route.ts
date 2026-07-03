export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Story content is exclusive to Kekere and may not be exported or downloaded.
export const POST = () =>
  NextResponse.json(
    { error: "Story export is not available. Stories are exclusive to Kekere." },
    { status: 403 },
  );
