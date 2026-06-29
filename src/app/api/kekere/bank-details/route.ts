import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { resolveBankAccount } from "@/lib/paystack/client";

const bankDetailsSchema = z.object({
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = bankDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { bankName, bankCode, accountNumber } = parsed.data;
  const resolution = await resolveBankAccount(accountNumber, bankCode);

  const data = resolution.verified
    ? { bankName, bankCode, accountNumber, accountName: resolution.accountName, verifiedAt: new Date() }
    : { bankName, bankCode, accountNumber, accountName: "", verifiedAt: null };

  await prisma.writerBankDetails.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  if (!resolution.verified) {
    return NextResponse.json({
      saved: true,
      verified: false,
      warning: "We could not verify this account. Please double-check your details before withdrawing.",
    });
  }

  return NextResponse.json({ saved: true, verified: true });
});

export const GET = withAuth(async (_request, session) => {
  const bankDetails = await prisma.writerBankDetails.findUnique({ where: { userId: session.user.id } });
  if (!bankDetails) {
    return NextResponse.json({ bankDetails: null });
  }

  return NextResponse.json({
    bankDetails: {
      id: bankDetails.id,
      bankName: bankDetails.bankName,
      accountNumberLast4: bankDetails.accountNumber.slice(-4),
      accountName: bankDetails.accountName,
      verifiedAt: bankDetails.verifiedAt,
      bankCode: bankDetails.bankCode,
    },
  });
});
