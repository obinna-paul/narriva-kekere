import { NarrivaTheme } from "@/components/theme";
import { TermsOfUse } from "@/content/legal/terms-of-use";

export const metadata = { title: "Terms of Use — Narriva" };

export default function NarrivaTermsPage() {
  return (
    <NarrivaTheme>
      <main>
        <TermsOfUse brand="Narriva" />
      </main>
    </NarrivaTheme>
  );
}
