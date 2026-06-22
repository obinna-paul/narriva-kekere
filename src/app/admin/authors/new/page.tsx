import { Heading } from "@/components/ui/typography";
import { AuthorForm } from "@/components/admin/author-form";

export default function NewAuthorPage() {
  return (
    <div>
      <Heading as="h1" size="h2">
        New author
      </Heading>
      <div className="mt-6">
        <AuthorForm mode="create" />
      </div>
    </div>
  );
}
