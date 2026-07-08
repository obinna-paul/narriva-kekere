import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NarrivaTheme } from "@/components/theme";
import { ServicePageTemplate } from "@/components/narriva/service-page-template";
import { getServiceBySlug as getStaticService } from "@/content/mock/narriva-services";
import { getServiceBySlug } from "@/lib/data/services";
import { toServiceContent } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

async function loadService() {
  const dbService = await getServiceBySlug("editorial");
  return dbService ? toServiceContent(dbService) : getStaticService("editorial");
}

export async function generateMetadata(): Promise<Metadata> {
  const service = await loadService();
  if (!service) return {};
  return {
    title: service.name,
    description: service.tagline,
    alternates: { canonical: "/services/editorial" },
  };
}

// Reads the admin-editable Service record first, so edits at /admin/services
// take effect; falls back to the static copy if that service hasn't been
// seeded yet (e.g. no DB connection in this environment — see README).
export default async function EditorialServicePage() {
  const service = await loadService();
  if (!service) notFound();

  return (
    <NarrivaTheme>
      <ServicePageTemplate service={service} />
    </NarrivaTheme>
  );
}
