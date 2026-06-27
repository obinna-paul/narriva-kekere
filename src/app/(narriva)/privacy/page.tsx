import { NarrivaTheme } from "@/components/theme";
import { PrivacyPolicy } from "@/content/legal/privacy-policy";

export const metadata = { title: "Privacy Policy — Narriva" };

export default function NarrivaPrivacyPage() {
  return (
    <NarrivaTheme>
      <main>
        <PrivacyPolicy brand="Narriva" />
      </main>
    </NarrivaTheme>
  );
}
