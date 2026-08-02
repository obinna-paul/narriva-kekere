export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";
import { reconcileRecentTopUps } from "@/lib/economy/reconcile-topups";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

const schema = z.object({
  // How far back to sweep. Bounded so an admin can't accidentally ask Paystack
  // for months of history in one click.
  sinceHours: z.number().int().min(1).max(720).optional(),
});

/**
 * On-demand run of the same top-up reconciliation the nightly cron performs —
 * lists Paystack's successful charges over the recent window and credits any
 * wallet top-up that never landed. Idempotent (keyed on the Paystack
 * reference), so it never double-credits. Lets an admin recover missed
 * payments immediately when a report comes in, instead of waiting for the
 * nightly sweep.
 */
export const POST = withAuth(
  async (request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const sinceHours = parsed.data.sinceHours ?? 48;

    let result;
    try {
      result = await reconcileRecentTopUps({ sinceHours });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Couldn't reach Paystack to run the sweep." },
        { status: 502 },
      );
    }

    await logAdminAction(session.user.id, session.user.id, "RECONCILE_TOPUPS_SWEEP", {
      sinceHours,
      credited: result.credited,
      alreadyCredited: result.alreadyCredited,
      skipped: result.skipped,
    });

    return NextResponse.json({ success: true, sinceHours, ...result });
  },
  { roles: ["ADMIN"] },
);
