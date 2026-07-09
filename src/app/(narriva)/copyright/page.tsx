import { NarrivaTheme } from "@/components/theme";
import { CopyrightPolicy } from "@/content/legal/copyright-policy";

export const metadata = {
  title: "Copyright & IP Policy",
  description: "Narriva's copyright and intellectual property policy for authors and readers.",
  alternates: { canonical: "/copyright" },
};

export default function NarrivaCopyrightPage() {
  return (
    <NarrivaTheme>
      <main>
        <CopyrightPolicy />
      </main>
    </NarrivaTheme>
  );
}
