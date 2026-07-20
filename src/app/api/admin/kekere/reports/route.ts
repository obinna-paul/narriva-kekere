export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { listReports } from "@/lib/data/kekere-reports";
import type { ReportStatus } from "@prisma/client";

const VALID_STATUSES: ReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? "OPEN";
    const status = VALID_STATUSES.includes(statusParam as ReportStatus) ? (statusParam as ReportStatus) : "OPEN";

    const reports = await listReports(status);
    return NextResponse.json({ reports });
  },
  { roles: ["ADMIN"] }
);
