import { redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { ContractsInbox } from "@/components/kekere/contracts-inbox";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function KekereContractsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const contracts = await prisma.kekereContract.findMany({
    where: { writerId: session.user.id },
    include: { template: { select: { contractType: true } } },
    orderBy: { sentAt: "desc" },
  });

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <KekereNavWrapper />
        <ContractsInbox
          contracts={contracts.map((c) => ({
            id: c.id,
            contractType: c.template.contractType,
            sentAt: c.sentAt.toISOString(),
            status: c.status as "PENDING" | "SIGNED" | "DECLINED" | "EXPIRED" | "VOIDED",
            signedAt: c.signedAt?.toISOString(),
            signedPdfRef: c.signedPdfRef,
          }))}
        />
      </div>
    </KekereTheme>
  );
}
