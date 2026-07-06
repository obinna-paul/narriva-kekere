export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { listBanks } from "@/lib/paystack/client";

export const GET = withAuth(async () => {
  try {
    const banks = await listBanks();
    return NextResponse.json({ banks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load bank list" },
      { status: 502 }
    );
  }
});
