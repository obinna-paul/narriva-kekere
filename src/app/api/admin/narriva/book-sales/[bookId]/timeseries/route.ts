import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (request, _session, { params }) => {
    const { bookId } = params as { bookId: string };
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, price: true },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const purchases = await prisma.bookPurchase.findMany({
      where: { bookId, purchasedAt: { gte: start, lte: end } },
      orderBy: { purchasedAt: "asc" },
    });

    const daily = new Map<string, { units: number; revenueNgn: number }>();
    purchases.forEach((p) => {
      const date = p.purchasedAt.toISOString().split("T")[0];
      const entry = daily.get(date) ?? { units: 0, revenueNgn: 0 };
      entry.units += 1;
      entry.revenueNgn += book.price;
      daily.set(date, entry);
    });

    const result: { date: string; units: number; revenueNgn: number }[] = [];
    daily.forEach((v, date) => {
      result.push({
        date,
        units: v.units,
        revenueNgn: Math.round(v.revenueNgn * 100) / 100,
      });
    });
    result.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      bookId: book.id,
      title: book.title,
      price: book.price,
      daily: result,
    });
  },
  { roles: ["ADMIN"] },
);
