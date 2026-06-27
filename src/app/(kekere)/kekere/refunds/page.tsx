import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { RefundsPolicy } from "@/content/legal/refunds-policy";

export const metadata = { title: "Refund & Cancellation Policy Ã¢â‚¬â€ Kekere" };

export default function KekereRefundsPage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-20">
        <KekereNavWrapper />
        <RefundsPolicy />
      </div>
    </KekereTheme>
  );
}
