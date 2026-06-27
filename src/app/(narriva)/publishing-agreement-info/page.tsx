import { NarrivaTheme } from "@/components/theme";
import { PublishingAgreementInfo } from "@/content/legal/publishing-agreement-info";

export const metadata = { title: "Publishing Agreement Overview — Narriva" };

export default function PublishingAgreementInfoPage() {
  return (
    <NarrivaTheme>
      <main>
        <PublishingAgreementInfo />
      </main>
    </NarrivaTheme>
  );
}
