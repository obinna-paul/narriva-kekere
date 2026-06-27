import { NarrivaTheme } from "@/components/theme";
import { BlogListing } from "@/components/narriva/blog-listing";
import { listBlogPosts } from "@/lib/data/blog";
import { toBlogCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { posts } = await listBlogPosts({ pageSize: 100 });

  return (
    <NarrivaTheme>
      <main>
        <BlogListing posts={posts.map(toBlogCardData)} />
      </main>
    </NarrivaTheme>
  );
}
