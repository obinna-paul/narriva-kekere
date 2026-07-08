import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NarrivaTheme } from "@/components/theme";
import { ServicePageTemplate } from "@/components/narriva/service-page-template";
import { getServiceBySlug as getStaticService } from "@/content/mock/narriva-services";
import { getServiceBySlug } from "@/lib/data/services";
import { toServiceContent } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

async function loadService() {
  const dbService = await getServiceBySlug("author-growth");
  return dbService ? toServiceContent(dbService) : getStaticService("author-growth");
}

export async function generateMetadata(): Promise<Metadata> {
  const service = await loadService();
  if (!service) return {};
  return {
    title: service.name,
    description: service.tagline,
    alternates: { canonical: "/services/author-growth" },
  };
}

export default async function AuthorGrowthServicePage() {
  const service = await loadService();
  if (!service) notFound();

  return (
    <NarrivaTheme>
      <ServicePageTemplate service={service} />
    </NarrivaTheme>
  );
}
