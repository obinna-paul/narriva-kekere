export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { resolveBankAccount } from "@/lib/paystack/client";
import { getWriterBankDetails } from "@/lib/data/kekere-bank-details";

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
      warning: resolution.message || "We could not verify this account. Please double-check your details before withdrawing.",
    });
  }

  return NextResponse.json({ saved: true, verified: true, accountName: resolution.accountName });
});

export const GET = withAuth(async (_request, session) => {
  const bankDetails = await getWriterBankDetails(session.user.id);
  return NextResponse.json({ bankDetails });
});
