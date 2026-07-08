import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { CopyrightPolicy } from "@/content/legal/copyright-policy";

export const metadata = {
  title: "Copyright & IP Policy",
  description: "Kekere Stories' copyright and intellectual property policy for writers and readers.",
  alternates: { canonical: "/kekere/copyright" },
};

export default function KekereCopyrightPage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-[calc(80px+env(safe-area-inset-bottom))]">
        <KekereNavWrapper />
        <CopyrightPolicy />
      </div>
    </KekereTheme>
  );
}
