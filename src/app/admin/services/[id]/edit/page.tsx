import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/typography";
import { ServiceForm } from "@/components/admin/service-form";
import { getServiceById } from "@/lib/data/services";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: { id: string } }) {
  const service = await getServiceById(params.id);
  if (!service) notFound();

  return (
    <div>
      <Heading as="h1" size="h2">
        Edit service
      </Heading>
      <div className="mt-6">
        <ServiceForm
          mode="edit"
          initial={{
            slug: service.slug,
            title: service.title,
            opening: service.content.opening,
            included: service.content.included
              .map((item) => `${item.title}|${item.description}`)
              .join("\n"),
            closing: service.content.closing,
            costClarity: service.content.costClarity,
            faqs: service.content.faqs.map((f) => `${f.question}|${f.answer}`).join("\n"),
            order: String(service.order),
          }}
        />
      </div>
    </div>
  );
}
