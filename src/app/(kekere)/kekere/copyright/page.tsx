import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { CopyrightPolicy } from "@/content/legal/copyright-policy";

export const metadata = { title: "Copyright & IP Policy Ã¢â‚¬â€ Kekere" };

export default function KekereCopyrightPage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-20">
        <KekereNavWrapper />
        <CopyrightPolicy />
      </div>
    </KekereTheme>
  );
}
