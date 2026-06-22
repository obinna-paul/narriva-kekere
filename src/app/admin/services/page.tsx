import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listServices } from "@/lib/data/services";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await listServices();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading as="h1" size="h2">
          Services ({services.length})
        </Heading>
        <Link href="/admin/services/new" className={cn(buttonVariants({ size: "sm" }))}>
          New service
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{service.title}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">/services/{service.slug}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{service.order}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/services/${service.id}/edit`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      endpoint={`/api/services/${service.slug}`}
                      confirmLabel={service.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No services seeded yet — public pages are showing the static fallback copy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
