import Link from "next/link";
import { unsubscribeByToken } from "@/lib/notifications/email-preferences";

export const dynamic = "force-dynamic";

// Deliberately not gated by middleware (see KEKERE_PROTECTED_PREFIXES) — a
// one-click unsubscribe must work for a logged-out recipient straight from
// their inbox, no login required. The action happens on page load itself
// (a GET), matching standard one-click-unsubscribe practice rather than
// requiring a confirmation click.
export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const success = await unsubscribeByToken(params.token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD] px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-[22px] font-bold text-[#2A1A12]">
          {success ? "You're unsubscribed" : "Link not valid"}
        </h1>
        <p className="mb-5 text-[14px] leading-[1.6] text-[rgba(42,26,18,.6)]">
          {success
            ? "You won't get any more of these emails — new stories from writers you follow, note replies, streak reminders, or the weekly digest. You'll still get essential account emails like password resets and contract notices."
            : "This unsubscribe link is invalid or has already been used. If you're still getting emails you'd rather not, you can turn them off from your account settings instead."}
        </p>
        <Link
          href="/kekere/settings"
          className="inline-block rounded-[10px] bg-[#C75D2C] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#B0531E]"
        >
          Go to settings
        </Link>
      </div>
    </div>
  );
}
