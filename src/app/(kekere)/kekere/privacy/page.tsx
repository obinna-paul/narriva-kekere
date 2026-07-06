import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { PrivacyPolicy } from "@/content/legal/privacy-policy";

export const metadata = { title: "Privacy Policy Ã¢â‚¬â€ Kekere" };

export default function KekerePrivacyPage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-[calc(80px+env(safe-area-inset-bottom))]">
        <KekereNavWrapper />
        <PrivacyPolicy brand="Kekere" />
      </div>
    </KekereTheme>
  );
}
