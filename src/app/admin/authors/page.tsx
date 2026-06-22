import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listAuthors } from "@/lib/data/authors";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

export default async function AdminAuthorsPage() {
  const authors = await listAuthors();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading as="h1" size="h2">
          Authors ({authors.length})
        </Heading>
        <Link href="/admin/authors/new" className={cn(buttonVariants({ size: "sm" }))}>
          New author
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{author.name}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{author.slug ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{author.shortBio ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/authors/${author.id}/edit`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton endpoint={`/api/authors/${author.id}`} confirmLabel={author.name} />
                  </div>
                </td>
              </tr>
            ))}
            {authors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No authors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
