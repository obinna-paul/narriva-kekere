import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/typography";
import { BlogForm } from "@/components/admin/blog-form";
import { getBlogPostByIdForAdmin } from "@/lib/data/blog";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const post = await getBlogPostByIdForAdmin(params.id);
  if (!post) notFound();

  return (
    <div>
      <Heading as="h1" size="h2">
        Edit blog post
      </Heading>
      <div className="mt-6">
        <BlogForm
          mode="edit"
          initial={{
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            coverColor: post.coverColor,
            category: post.category,
            tags: post.tags.join(", "),
            authorName: post.authorName,
            status: post.status,
          }}
        />
      </div>
    </div>
  );
}
