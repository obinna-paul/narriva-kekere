import { notFound } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { ServicePageTemplate } from "@/components/narriva/service-page-template";
import { getServiceBySlug as getStaticService } from "@/content/mock/narriva-services";
import { getServiceBySlug } from "@/lib/data/services";
import { toServiceContent } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function GhostwritingServicePage() {
  const dbService = await getServiceBySlug("ghostwriting");
  const service = dbService ? toServiceContent(dbService) : getStaticService("ghostwriting");
  if (!service) notFound();

  return (
    <NarrivaTheme>
      <ServicePageTemplate service={service} />
    </NarrivaTheme>
  );
}
