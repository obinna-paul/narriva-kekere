import { NarrivaTheme } from "@/components/theme";
import { CopyrightPolicy } from "@/content/legal/copyright-policy";

export const metadata = { title: "Copyright & IP Policy — Narriva" };

export default function NarrivaCopyrightPage() {
  return (
    <NarrivaTheme>
      <main>
        <CopyrightPolicy />
      </main>
    </NarrivaTheme>
  );
}
