import { NarrivaTheme } from "@/components/theme";
import { PrivacyPolicy } from "@/content/legal/privacy-policy";

export const metadata = {
  title: "Privacy Policy",
  description: "How Narriva collects, uses, and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function NarrivaPrivacyPage() {
  return (
    <NarrivaTheme>
      <main>
        <PrivacyPolicy brand="Narriva" />
      </main>
    </NarrivaTheme>
  );
}
