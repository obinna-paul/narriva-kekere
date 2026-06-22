import { Heading } from "@/components/ui/typography";
import { BookForm } from "@/components/admin/book-form";
import { listAuthors } from "@/lib/data/authors";

export const dynamic = "force-dynamic";

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: { title?: string };
}) {
  const authors = await listAuthors();

  return (
    <div>
      <Heading as="h1" size="h2">
        New book
      </Heading>
      <div className="mt-6">
        <BookForm
          mode="create"
          authors={authors.map((a) => ({ id: a.id, name: a.name }))}
          initial={searchParams.title ? { title: searchParams.title } : undefined}
        />
      </div>
    </div>
  );
}
