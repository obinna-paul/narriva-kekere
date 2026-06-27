import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { HeroBookStack } from "@/components/narriva/hero-book-stack";
import { FeaturedBooksCarousel } from "@/components/narriva/featured-books-carousel";
import { ProcessFlow, type ProcessStep } from "@/components/narriva/process-flow";
import { AuthorCard } from "@/components/narriva/author-card";
import { BlogCard } from "@/components/narriva/blog-card";
import { getFeaturedBooks } from "@/lib/data/books";
import { listAuthors } from "@/lib/data/authors";
import { listBlogPosts } from "@/lib/data/blog";
import { toAuthorCardData, toBlogCardData, toBookCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

const OFFERINGS = [
  {
    num: "01",
    title: "We work with what you have",
    body: "Whether your manuscript is a rough first draft or nearly publication-ready, we meet you where you are and build from there.",
  },
  {
    num: "02",
    title: "Real editorial work",
    body: "Developmental and line editing from people who've shaped the kind of book you're trying to write — not a proofreading pass dressed up as editing.",
  },
  {
    num: "03",
    title: "Design that holds up next to anything on the shelf",
    body: "Covers and interiors built to compete with traditional houses.",
  },
  {
    num: "04",
    title: "One team, start to finish",
    body: "Editorial, design, ISBN, print-ready files, and launch handled by people who talk to each other.",
  },
  {
    num: "05",
    title: "A bookstore that actually sells",
    body: "Your book lives on a storefront built to move copies, not a portfolio page.",
  },
  {
    num: "06",
    title: "A relationship, not a transaction",
    body: "We stay invested in what happens after launch. Most publishers stop caring the day your book ships.",
  },
] as const;

const PROCESS_STEPS: readonly ProcessStep[] = [
  { title: "Submit", description: "Send your manuscript and a short note on what it is and who it's for." },
  {
    title: "Assess",
    description: "We read it and tell you what it needs — editorial depth, light copy editing, or in between.",
  },
  { title: "Plan", description: "We scope the work together and agree on the path to publication." },
  { title: "Build", description: "Editorial passes, design, interior layout — the part that matters most." },
  { title: "Produce", description: "ISBN, print-ready files, digital formatting, proofs." },
  {
    title: "Launch",
    description: "Your book goes live in the bookstore with a plan behind it, not just a listing.",
  },
];

export default async function NarrivaHomePage() {
  const [featuredBooks, authors, blogResult] = await Promise.all([
    getFeaturedBooks(6),
    listAuthors({ withBooksOnly: true }),
    listBlogPosts({ pageSize: 3 }),
  ]);

  const books = featuredBooks.map(toBookCardData);
  const homeAuthors = authors.slice(0, 3).map(toAuthorCardData);
  const recentPosts = blogResult.posts.map(toBlogCardData);

  return (
    <NarrivaTheme>
      <main>
        {/* Hero */}
        <header className="mx-auto grid max-w-[1240px] gap-16 px-8 py-24 [grid-template-columns:1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-[30px] flex items-center gap-3.5">
              <div className="h-px w-9 bg-[var(--color-accent)]" />
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-accent-text)]">
                Narriva Publishing
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[44px] font-medium leading-[1.04] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[54px] lg:text-[62px]">
              Some manuscripts
              <br />
              are written.
              <br />
              <span className="italic text-[var(--color-primary)]">
                The good ones
                <br />
                get built.
              </span>
            </h1>
            <p className="mt-[30px] max-w-[480px] text-lg leading-[1.65] text-[var(--color-muted)]">
              Narriva is a publishing house for authors at every stage: from a rough idea on your mind to a polished book on the shelves.
            </p>
            <div className="mt-[38px] flex flex-wrap items-center gap-[22px]">
              <Link href="/submit" className={cn(buttonVariants({ size: "lg" }), "px-7 py-4")}>
                Submit Your Manuscript
              </Link>
              <Link
                href="/books"
                className="border-b border-[var(--color-ink)]/25 py-4 text-[15px] font-medium text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Browse the bookstore →
              </Link>
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <HeroBookStack />
          </div>
        </header>

        {/* Featured Books */}
        <section className="pb-[90px] pt-[30px]">
          <div className="mx-auto mb-[34px] flex max-w-[1240px] items-end justify-between px-8">
            <div>
              <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                From the shelf
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[40px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                Recently built
              </h2>
            </div>
            <Link
              href="/books"
              className="border-b border-[var(--color-primary)]/30 text-sm font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
            >
              View the full bookstore →
            </Link>
          </div>
          <FeaturedBooksCarousel books={books} />
        </section>

        {/* What you get */}
        <section className="border-t border-[var(--color-ink)]/[0.07] bg-[var(--color-bg-alt)]">
          <div className="mx-auto max-w-[1240px] px-8 py-24">
            <div className="mb-[58px] max-w-[620px]">
              <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                For authors
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[40px] font-medium leading-[1.1] tracking-[-0.015em] text-[var(--color-ink)]">
                What you get that a printer can&apos;t give you
              </h2>
            </div>
            <div className="grid gap-px border border-[var(--color-ink)]/[0.09] bg-[var(--color-ink)]/[0.09] sm:grid-cols-2 lg:grid-cols-3">
              {OFFERINGS.map((o) => (
                <div key={o.num} className="bg-[var(--color-bg-alt)] px-[34px] py-[34px] pb-[38px]">
                  <div className="mb-5 font-[family-name:var(--font-display)] text-[15px] tracking-[0.02em] text-[var(--color-accent)]">
                    {o.num}
                  </div>
                  <h3 className="mb-3 font-[family-name:var(--font-display)] text-[21px] font-medium leading-[1.25] text-[var(--color-ink)]">
                    {o.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.62] text-[var(--color-muted)]">{o.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[1240px] px-8 py-24">
            <div className="mx-auto mb-16 max-w-[620px] text-center">
              <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                Process
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[40px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                From manuscript to bookstore
              </h2>
            </div>
            <ProcessFlow steps={PROCESS_STEPS} />
          </div>
        </section>

        {/* Authors */}
        <section className="border-t border-[var(--color-ink)]/[0.07] bg-[var(--color-bg-alt)]">
          <div className="mx-auto max-w-[1240px] px-8 py-24">
            <div className="mb-[46px] flex items-end justify-between">
              <div>
                <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                  Built here
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[40px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                  Authors
                </h2>
              </div>
              <Link
                href="/authors"
                className="border-b border-[var(--color-primary)]/30 text-sm font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
              >
                All authors →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-3">
              {homeAuthors.map((author) => (
                <AuthorCard key={author.slug} author={author} />
              ))}
            </div>
          </div>
        </section>

        {/* Blog teaser */}
        <section className="border-t border-[var(--color-ink)]/[0.07]">
          <div className="mx-auto max-w-[1240px] px-8 py-24">
            <div className="mb-[46px] flex items-end justify-between">
              <div>
                <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
                  Reading &amp; writing
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[40px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                  From the desk
                </h2>
              </div>
              <Link
                href="/blog"
                className="border-b border-[var(--color-primary)]/30 text-sm font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
              >
                All posts →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {recentPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>

        {/* Submission CTA */}
        <section className="bg-[var(--color-primary)] text-[var(--color-bg)]">
          <div className="mx-auto max-w-[1240px] px-8 py-[104px] text-center">
            <div className="mx-auto mb-[30px] h-px w-10 bg-[var(--color-accent)]" />
            <h2 className="mx-auto max-w-[680px] font-[family-name:var(--font-display)] text-[36px] font-medium leading-[1.12] tracking-[-0.015em] sm:text-[46px]">
              Ready to bring us your manuscript?
            </h2>
            <p className="mx-auto mt-[22px] max-w-[520px] text-lg leading-[1.6] text-[var(--color-bg)]/80">
              Tell us about your book. We&apos;ll read it, assess what it needs, and put
              together a plan.
            </p>
            <Link
              href="/submit"
              className="mt-[38px] inline-block rounded-[var(--radius-button)] bg-[var(--color-bg)] px-8 py-4 text-[15px] font-medium text-[var(--color-primary)] hover:bg-white"
            >
              Submit Your Manuscript
            </Link>
          </div>
        </section>
      </main>
    </NarrivaTheme>
  );
}
