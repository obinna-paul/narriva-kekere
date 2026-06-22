import { Heading } from "@/components/ui/typography";
import { ServiceForm } from "@/components/admin/service-form";

export default function NewServicePage() {
  return (
    <div>
      <Heading as="h1" size="h2">
        New service
      </Heading>
      <div className="mt-6">
        <ServiceForm mode="create" />
      </div>
    </div>
  );
}
