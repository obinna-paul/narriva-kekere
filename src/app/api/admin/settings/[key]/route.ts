export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { invalidateSettingCache } from "@/lib/settings/get";

const ALLOWED_KEYS = [
  "monthly_revenue_target_ngn",
  "writer_earnings_rate",
  "referral_reward_cowries",
  "tip_amount_cowries",
  "withdrawal_rate_ngn_per_cowrie",
  "minimum_withdrawal_cowries",
];

function validateValue(key: string, value: string): string | null {
  const num = Number(value);

  switch (key) {
    case "monthly_revenue_target_ngn":
      if (!Number.isInteger(num) || num <= 0) return "Must be a positive integer.";
      break;
    case "writer_earnings_rate":
      if (isNaN(num) || num < 0.01 || num > 0.99) return "Must be a float between 0.01 and 0.99.";
      break;
    case "referral_reward_cowries":
    case "tip_amount_cowries":
      if (!Number.isInteger(num) || num < 1 || num > 50) return "Must be an integer between 1 and 50.";
      break;
    case "withdrawal_rate_ngn_per_cowrie":
      if (!Number.isInteger(num) || num <= 0) return "Must be a positive integer.";
      break;
    case "minimum_withdrawal_cowries":
      if (!Number.isInteger(num) || num < 1 || num > 1000) return "Must be an integer between 1 and 1000.";
      break;
  }

  return null;
}

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { key } = params as { key: string };

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { error: `Key "${key}" is not allowed. Allowed keys: ${ALLOWED_KEYS.join(", ")}` },
        { status: 400 },
      );
    }

    let body: { value?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.value !== "string" || body.value.trim() === "") {
      return NextResponse.json({ error: "value is required." }, { status: 400 });
    }

    const value = body.value.trim();
    const validationError = validateValue(key, value);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: `Admin-managed setting for ${key}` },
    });

    invalidateSettingCache(key);

    return NextResponse.json({
      success: true,
      setting: {
        key: setting.key,
        value: setting.value,
        updatedAt: setting.updatedAt.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] },
);
