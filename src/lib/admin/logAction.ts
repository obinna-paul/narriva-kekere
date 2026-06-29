import { prisma } from "@/lib/db/prisma";

export async function logAdminAction(
  adminId: string,
  targetUserId: string,
  action: string,
  detail?: object,
) {
  await prisma.adminAction.create({
    data: {
      adminId,
      targetUserId,
      action,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detail: (detail ?? null) as any,
    },
  });
}
