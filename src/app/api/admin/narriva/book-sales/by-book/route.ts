import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const books = await prisma.book.findMany({
      where: { price: { gt: 0 } },
      include: {
        author: { select: { name: true } },
        purchases: { select: { id: true, purchasedAt: true } },
      },
    });

    const result = books.map((b) => {
      const totalUnits = b.purchases.length;
      const totalRevenueNgn = totalUnits * b.price;
      const daysSincePublished = b.publishedAt
        ? Math.max(1, Math.ceil((Date.now() - b.publishedAt.getTime()) / 86400000))
        : 1;
      const sorted = b.purchases
        .map((p) => p.purchasedAt.getTime())
        .sort((a, b) => a - b);
      const firstSaleAt = sorted[0] ? new Date(sorted[0]) : null;
      const lastSaleAt = sorted[sorted.length - 1]
        ? new Date(sorted[sorted.length - 1])
        : null;

      return {
        id: b.id,
        title: b.title,
        authorName: b.author.name,
        price: b.price,
        totalUnits,
        totalRevenueNgn,
        avgUnitsPerDay: Math.round((totalUnits / daysSincePublished) * 100) / 100,
        firstSaleAt: firstSaleAt?.toISOString() ?? null,
        lastSaleAt: lastSaleAt?.toISOString() ?? null,
      };
    });

    result.sort((a, b) => b.totalRevenueNgn - a.totalRevenueNgn);

    return NextResponse.json({ books: result });
  },
  { roles: ["ADMIN"] },
);
