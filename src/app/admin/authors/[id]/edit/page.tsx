import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/typography";
import { AuthorForm } from "@/components/admin/author-form";
import { getAuthorById } from "@/lib/data/authors";

export const dynamic = "force-dynamic";

export default async function EditAuthorPage({ params }: { params: { id: string } }) {
  const author = await getAuthorById(params.id);
  if (!author) notFound();

  return (
    <div>
      <Heading as="h1" size="h2">
        Edit author
      </Heading>
      <div className="mt-6">
        <AuthorForm
          mode="edit"
          authorId={author.id}
          initial={{
            name: author.name,
            slug: author.slug ?? "",
            shortBio: author.shortBio ?? "",
            bio: author.bio ?? "",
            avatarColor: author.avatarColor ?? "#1E3A8A",
            socialLinks: (
              (author.socialLinks as { label: string; href: string }[] | null) ?? []
            )
              .map((link) => `${link.label}|${link.href}`)
              .join("\n"),
          }}
        />
      </div>
    </div>
  );
}
