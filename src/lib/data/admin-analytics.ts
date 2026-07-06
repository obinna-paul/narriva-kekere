import { prisma } from "@/lib/db/prisma";

// Real Narriva book revenue lives in BookPurchase (written by
// createBookPurchase in books.ts) — nothing in the codebase ever writes to
// the older BookSale table, so querying it always returned zero/empty
// regardless of actual sales.

export async function getAdminOverview() {
  const [totalUsers, totalLeads, totalProjects, totalBooks, recentPurchases, signups7d] =
    await Promise.all([
      prisma.user.count(),
      prisma.nariConversation.count({ where: { classifiedLead: true } }),
      prisma.authorProject.count(),
      prisma.book.count(),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { book: { select: { price: true } } },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  return {
    totalUsers,
    totalLeads,
    totalProjects,
    totalBooks,
    revenue30d: recentPurchases.reduce((sum, p) => sum + p.book.price, 0),
    salesCount30d: recentPurchases.length,
    signups7d,
  };
}

export async function getSalesData(days = 30) {
  const purchases = await prisma.bookPurchase.findMany({
    where: {
      purchasedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    },
    include: { book: { select: { title: true, price: true, author: { select: { name: true } } } } },
    orderBy: { purchasedAt: "desc" },
    take: 100,
  });

  return purchases.map((p) => ({
    id: p.id,
    book: p.book,
    amountNgn: p.book.price,
    saleDate: p.purchasedAt,
  }));
}

export async function getAuthorBookSales(authorId: string) {
  const purchases = await prisma.bookPurchase.findMany({
    where: { book: { authorId } },
    include: { book: { select: { title: true, price: true } } },
    orderBy: { purchasedAt: "desc" },
    take: 100,
  });

  return purchases.map((p) => ({
    id: p.id,
    book: p.book,
    amountNgn: p.book.price,
    saleDate: p.purchasedAt,
  }));
}
