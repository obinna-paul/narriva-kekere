export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAdminOverview } from "@/lib/data/admin-analytics";

export const GET = withAuth(
  async () => {
    const data = await getAdminOverview();
    return NextResponse.json(data);
  },
  { roles: ["ADMIN"] },
);
