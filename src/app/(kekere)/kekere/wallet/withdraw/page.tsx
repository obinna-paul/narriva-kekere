import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WithdrawalPage } from "@/components/kekere/withdrawal-flow";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getWriterBankDetails } from "@/lib/data/kekere-bank-details";

export const dynamic = "force-dynamic";

export default async function KekereWithdrawPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const [wallet, bankDetails] = await Promise.all([
    getWalletForUser(session.user.id),
    getWriterBankDetails(session.user.id),
  ]);

  const isVerified = !!bankDetails?.verifiedAt;

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <KekereNavWrapper />
        {isVerified && bankDetails ? (
          <WithdrawalPage
            availableBalance={wallet?.earnedBalance.toNumber() ?? 0}
            bankDetails={{
              bankName: bankDetails.bankName,
              accountNumberLast4: bankDetails.accountNumberLast4,
              accountName: bankDetails.accountName,
            }}
          />
        ) : (
          <div className="mx-auto max-w-[402px] px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-6">
            <div className="flex items-center gap-3">
              <Link
                href="/kekere/wallet"
                aria-label="Back to wallet"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[rgba(42,26,18,0.08)]"
              >
                <ArrowLeft size={16} className="text-[#8A7565]" />
              </Link>
              <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#2A1A12]">Withdraw</h1>
            </div>
            <div className="mt-10 flex flex-col items-center text-center">
              <h2 className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[#2A1A12]">
                Add your bank details first
              </h2>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#8A7565]">
                {bankDetails
                  ? "Your bank details couldn't be verified. Update them in your profile before withdrawing."
                  : "You need a verified bank account before you can withdraw cowries."}
              </p>
              <Link
                href="/kekere/profile#bank-details"
                className="mt-6 rounded-[12px] bg-[#C75D2C] px-8 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Go to profile settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </KekereTheme>
  );
}
