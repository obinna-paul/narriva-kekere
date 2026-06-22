import { Heading } from "@/components/ui/typography";
import { BlogForm } from "@/components/admin/blog-form";

export default function NewBlogPostPage() {
  return (
    <div>
      <Heading as="h1" size="h2">
        New blog post
      </Heading>
      <div className="mt-6">
        <BlogForm mode="create" />
      </div>
    </div>
  );
}
