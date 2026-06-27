import { NextResponse } from "next/server";
import { getAdminOverview } from "@/lib/data/admin-analytics";

export async function GET() {
  const data = await getAdminOverview();
  return NextResponse.json(data);
}
