import { prisma } from "@/lib/db/prisma";

export async function getAdminOverview() {
  const [totalUsers, totalLeads, totalProjects, totalBooks, recentSales, signups7d] =
    await Promise.all([
      prisma.user.count(),
      prisma.nariConversation.count({ where: { classifiedLead: true } }),
      prisma.authorProject.count(),
      prisma.book.count(),
      prisma.bookSale.aggregate({
        _sum: { amountNgn: true, quantity: true },
        where: {
          saleDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
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
    revenue30d: recentSales._sum.amountNgn ?? 0,
    salesCount30d: recentSales._sum.quantity ?? 0,
    signups7d,
  };
}

export async function getSalesData(days = 30) {
  return prisma.bookSale.findMany({
    where: {
      saleDate: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    },
    include: { book: { select: { title: true, author: { select: { name: true } } } } },
    orderBy: { saleDate: "desc" },
    take: 100,
  });
}

export async function getAuthorBookSales(authorId: string) {
  return prisma.bookSale.findMany({
    where: { book: { authorId } },
    include: { book: { select: { title: true } } },
    orderBy: { saleDate: "desc" },
    take: 100,
  });
}
