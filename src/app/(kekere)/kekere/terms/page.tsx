import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { TermsOfUse } from "@/content/legal/terms-of-use";

export const metadata = { title: "Terms of Use Ã¢â‚¬â€ Kekere" };

export default function KekereTermsPage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-[calc(80px+env(safe-area-inset-bottom))]">
        <KekereNavWrapper />
        <TermsOfUse brand="Kekere" />
      </div>
    </KekereTheme>
  );
}
