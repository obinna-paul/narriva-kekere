export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

// All day/week keys are computed in Lagos calendar time, not UTC — a
// transaction in the first hour of a Lagos day (UTC+1) falls on the
// previous UTC day, which would otherwise shift it into the wrong bucket.
const lagosDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function lagosDateKey(date: Date): string {
  return lagosDateFormatter.format(date);
}

function getWeekKey(date: Date): string {
  const [y, m, d] = lagosDateKey(date).split("-").map(Number);
  const local = new Date(Date.UTC(y, m - 1, d));
  const day = local.getUTCDay();
  const diff = local.getUTCDate() - day + (day === 0 ? -6 : 1);
  local.setUTCDate(diff);
  return lagosDateKey(local);
}

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const metric = url.searchParams.get("metric") ?? "topup_ngn";
    const period = url.searchParams.get("period") ?? "daily";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();

    const results: { date: string; value: number }[] = [];

    function resolveKey(d: Date): string {
      return period === "weekly" ? getWeekKey(d) : lagosDateKey(d);
    }

    if (metric === "topup_ngn") {
      const transactions = await prisma.transaction.findMany({
        where: {
          type: "TOP_UP",
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
        select: { amountNgn: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const grouped = new Map<string, number>();
      transactions.forEach((t) => {
        const key = resolveKey(t.createdAt);
        grouped.set(key, (grouped.get(key) ?? 0) + (t.amountNgn ?? 0));
      });

      grouped.forEach((value, date) => {
        results.push({ date, value: Math.round(value * 100) / 100 });
      });
    } else if (metric === "unlock_count") {
      const unlocks = await prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: start, lte: end } },
        select: { unlockedAt: true },
        orderBy: { unlockedAt: "asc" },
      });

      const grouped = new Map<string, number>();
      unlocks.forEach((u) => {
        const key = resolveKey(u.unlockedAt);
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });

      grouped.forEach((value, date) => {
        results.push({ date, value });
      });
    } else if (metric === "new_wallets") {
      const wallets = await prisma.wallet.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const grouped = new Map<string, number>();
      wallets.forEach((w) => {
        const key = resolveKey(w.createdAt);
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });

      grouped.forEach((value, date) => {
        results.push({ date, value });
      });
    }

    results.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ metric, period, data: results });
  },
  { roles: ["ADMIN"] },
);
