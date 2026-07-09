import type { Metadata } from "next";
import { NarrivaTheme } from "@/components/theme";
import { BlogListing } from "@/components/narriva/blog-listing";
import { listBlogPosts } from "@/lib/data/blog";
import { toBlogCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Notes on writing, publishing, and building a career as an author — from the Narriva team.";

export const metadata: Metadata = {
  title: "Blog",
  description: DESCRIPTION,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/feed.xml" },
  },
  openGraph: {
    title: "Blog | Narriva",
    description: DESCRIPTION,
    url: "/blog",
    images: [`/api/og?brand=narriva&title=${encodeURIComponent("Narriva Blog")}`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Narriva",
    description: DESCRIPTION,
  },
};

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
