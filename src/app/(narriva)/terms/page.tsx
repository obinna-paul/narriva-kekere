import { NarrivaTheme } from "@/components/theme";
import { TermsOfUse } from "@/content/legal/terms-of-use";

export const metadata = {
  title: "Terms of Use",
  description: "The terms of use governing your access to Narriva's website and publishing services.",
  alternates: { canonical: "/terms" },
};

export default function NarrivaTermsPage() {
  return (
    <NarrivaTheme>
      <main>
        <TermsOfUse brand="Narriva" />
      </main>
    </NarrivaTheme>
  );
}
