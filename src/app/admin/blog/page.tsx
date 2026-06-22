import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listBlogPosts } from "@/lib/data/blog";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const { posts, total } = await listBlogPosts({ pageSize: 100, includeDrafts: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading as="h1" size="h2">
          Blog posts ({total})
        </Heading>
        <Link href="/admin/blog/new" className={cn(buttonVariants({ size: "sm" }))}>
          New post
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{post.title}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{post.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      post.status === "PUBLISHED"
                        ? "text-green-700"
                        : "text-[var(--color-ink)]/50"
                    }
                  >
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{post.authorName}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton endpoint={`/api/blog/${post.slug}`} confirmLabel={post.title} />
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
