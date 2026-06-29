import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
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
      return period === "weekly" ? getWeekKey(d) : d.toISOString().split("T")[0];
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
