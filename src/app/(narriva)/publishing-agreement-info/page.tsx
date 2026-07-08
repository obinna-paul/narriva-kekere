import { NarrivaTheme } from "@/components/theme";
import { PublishingAgreementInfo } from "@/content/legal/publishing-agreement-info";

export const metadata = {
  title: "Publishing Agreement Overview",
  description: "What Narriva's standard publishing agreement covers, in plain language, before you sign anything.",
  alternates: { canonical: "/publishing-agreement-info" },
};

export default function PublishingAgreementInfoPage() {
  return (
    <NarrivaTheme>
      <main>
        <PublishingAgreementInfo />
      </main>
    </NarrivaTheme>
  );
}
