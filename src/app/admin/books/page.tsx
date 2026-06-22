import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listBooks } from "@/lib/data/books";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default async function AdminBooksPage() {
  const { books, total } = await listBooks({ pageSize: 100 });

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading as="h1" size="h2">
          Books ({total})
        </Heading>
        <Link href="/admin/books/new" className={cn(buttonVariants({ size: "sm" }))}>
          New book
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Genre</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{book.title}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{book.author.name}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{book.genre}</td>
                <td className="px-4 py-3">{priceFormatter.format(book.price)}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/60">
                  {[book.featured && "Featured", book.isNewRelease && "New"]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/books/${book.id}/edit`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton endpoint={`/api/books/${book.id}`} confirmLabel={book.title} />
                  </div>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No books yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
