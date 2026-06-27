import { NarrivaTheme } from "@/components/theme";
import { RefundsPolicy } from "@/content/legal/refunds-policy";

export const metadata = { title: "Refund & Cancellation Policy — Narriva" };

export default function NarrivaRefundsPage() {
  return (
    <NarrivaTheme>
      <main>
        <RefundsPolicy />
      </main>
    </NarrivaTheme>
  );
}
