import { prisma } from "@/lib/db/prisma";

export interface KekereBankDetails {
  bankName: string;
  bankCode: string;
  accountNumberLast4: string;
  accountName: string;
  verifiedAt: Date | null;
}

export async function getWriterBankDetails(userId: string): Promise<KekereBankDetails | null> {
  const bankDetails = await prisma.writerBankDetails.findUnique({ where: { userId } });
  if (!bankDetails) return null;

  return {
    bankName: bankDetails.bankName,
    bankCode: bankDetails.bankCode,
    accountNumberLast4: bankDetails.accountNumber.slice(-4),
    accountName: bankDetails.accountName,
    verifiedAt: bankDetails.verifiedAt,
  };
}
