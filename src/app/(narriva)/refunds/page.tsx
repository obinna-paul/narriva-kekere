import { NarrivaTheme } from "@/components/theme";
import { RefundsPolicy } from "@/content/legal/refunds-policy";

export const metadata = {
  title: "Refund & Cancellation Policy",
  description: "Narriva's refund and cancellation policy for publishing services and bookstore purchases.",
  alternates: { canonical: "/refunds" },
};

export default function NarrivaRefundsPage() {
  return (
    <NarrivaTheme>
      <main>
        <RefundsPolicy />
      </main>
    </NarrivaTheme>
  );
}
