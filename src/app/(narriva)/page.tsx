import Link from "next/link";
import { ShieldX, PenTool, Layers, Workflow, Store, HeartHandshake } from "lucide-react";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section, Grid } from "@/components/ui/layout";
import { Heading, Body, Label } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { HeroBookAnimation } from "@/components/narriva/hero-book-animation";
import { FeaturedBooksCarousel } from "@/components/narriva/featured-books-carousel";
import { ProcessFlow, type ProcessStep } from "@/components/narriva/process-flow";
import { AuthorCard } from "@/components/narriva/author-card";
import { BlogCard } from "@/components/narriva/blog-card";
import { getFeaturedBooks } from "@/lib/data/books";
import { listAuthors } from "@/lib/data/authors";
import { listBlogPosts } from "@/lib/data/blog";
import { toAuthorCardData, toBlogCardData, toBookCardData } from "@/lib/adapters/narriva";

export const dynamic = "force-dynamic";

const WHY_NARRIVA = [
  {
    icon: ShieldX,
    lead: "We say no.",
    copy: "Most manuscripts that reach us aren't ready, and we'll tell you why instead of taking your money anyway.",
  },
  {
    icon: PenTool,
    lead: "Real editorial work.",
    copy: "Developmental and line editing from people who've actually shaped the kind of book you're trying to write — not a proofreading pass with a new label.",
  },
  {
    icon: Layers,
    lead: "Design that holds up next to anything on the shelf.",
    copy: 'Covers and interiors built to compete with traditional houses, not to look "good for self-published."',
  },
  {
    icon: Workflow,
    lead: "One team, start to finish.",
    copy: "Editorial, design, ISBN, print, and launch handled by people who talk to each other, not handed between vendors.",
  },
  {
    icon: Store,
    lead: "A bookstore that actually sells.",
    copy: "Your book lives on a storefront built to move copies, not a portfolio page that only your friends visit.",
  },
  {
    icon: HeartHandshake,
    lead: "A relationship, not a transaction.",
    copy: "We track what happens after launch. Most publishers stop caring the day your book ships.",
  },
] as const;

const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    title: "Submit",
    description: "Send us the manuscript and a short note on what it is and who it's for.",
  },
  {
    title: "Read",
    description: "An editor reads the whole thing. Not a synopsis. The whole thing.",
  },
  {
    title: "Decide",
    description: 'We tell you yes, no, or "yes, if." No form rejections.',
  },
  {
    title: "Build",
    description: "Editorial passes, design, layout — the part that takes the longest and matters the most.",
  },
  {
    title: "Produce",
    description: "ISBN, print-ready files, digital formatting, proofs.",
  },
  {
    title: "Launch",
    description: "The book goes live in the bookstore, with a plan behind it, not just a listing.",
  },
];

const FOOTER_COLUMNS = [
  {
    heading: "Services",
    links: [
      { label: "Publishing", href: "/services/publishing" },
      { label: "Editorial", href: "/services/editorial" },
      { label: "Design", href: "/services/design" },
      { label: "Author growth", href: "/services/author-growth" },
      { label: "Ghostwriting", href: "/services/ghostwriting" },
    ],
  },
  {
    heading: "Bookstore",
    links: [
      { label: "New releases", href: "/books" },
      { label: "All books", href: "/books" },
      { label: "Authors", href: "/authors" },
    ],
  },
  {
    heading: "Submission Guidelines",
    links: [
      { label: "How to submit", href: "/submit" },
      { label: "Editorial standards", href: "/standards" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "Submission inquiries", href: "/contact" },
      { label: "General contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
    ],
  },
] as const;

export default async function NarrivaHomePage() {
  const [featuredBooks, authors, blogResult] = await Promise.all([
    getFeaturedBooks(6),
    listAuthors(),
    listBlogPosts({ pageSize: 3 }),
  ]);

  const books = featuredBooks.map(toBookCardData);
  const homeAuthors = authors.slice(0, 4).map(toAuthorCardData);
  const recentPosts = blogResult.posts.map(toBlogCardData);

  return (
    <NarrivaTheme>
      <main>
        {/* Hero */}
        <Section spacing="lg" className="flex min-h-screen items-center !py-0">
          <Container>
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <Heading as="h1" size="h1" className="text-balance">
                  Some manuscripts are written. The good ones get built.
                </Heading>
                <Body size="lg" className="mt-6 max-w-xl text-[var(--color-ink)]/80">
                  Narriva is a publishing house for authors who want more than a printed
                  file with their name on it — editorial rigor, design that competes
                  internationally, and a publisher willing to say no. We take on fewer
                  books so the ones we publish can stand on their own.
                </Body>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/contact" className={cn(buttonVariants({ size: "lg" }))}>
                    See if your manuscript fits
                  </Link>
                  <Link
                    href="/books"
                    className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                  >
                    Browse the bookstore
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <HeroBookAnimation />
              </div>
            </div>
          </Container>
        </Section>

        {/* Featured Books */}
        <Section>
          <Container>
            <Label as="span" className="text-[var(--color-accent)]">FROM THE SHELF</Label>
            <Heading as="h2" size="h2" className="mt-2">
              Recently built
            </Heading>
            <div className="mt-10">
              <FeaturedBooksCarousel books={books} />
            </div>
          </Container>
        </Section>

        {/* Why Authors Choose Narriva */}
        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container>
            <Label as="span" className="text-[var(--color-accent)]">FOR AUTHORS</Label>
            <Heading as="h2" size="h2" className="mt-2 max-w-2xl text-balance">
              What you get that a printer can&apos;t give you
            </Heading>
            <Grid cols={3} gap="lg" className="mt-10">
              {WHY_NARRIVA.map(({ icon: Icon, lead, copy }) => (
                <div key={lead} className="flex flex-col gap-3">
                  <Icon
                    className="h-7 w-7 text-[var(--color-primary)]"
                    aria-hidden="true"
                    strokeWidth={1.5}
                  />
                  <Heading as="h3" size="h4">
                    {lead}
                  </Heading>
                  <Body size="sm" className="text-[var(--color-ink)]/70">
                    {copy}
                  </Body>
                </div>
              ))}
            </Grid>
          </Container>
        </Section>

        {/* How Publishing Works */}
        <Section>
          <Container>
            <Label as="span" className="text-[var(--color-accent)]">PROCESS</Label>
            <Heading as="h2" size="h2" className="mt-2">
              From manuscript to bookstore
            </Heading>
            <div className="mt-12">
              <ProcessFlow steps={PROCESS_STEPS} />
            </div>
          </Container>
        </Section>

        {/* Selective by Design */}
        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container size="md" className="text-center">
            <Label as="span" className="text-[var(--color-accent)]">STANDARDS</Label>
            <Heading as="h2" size="h2" className="mt-2 text-balance">
              We don&apos;t publish everything, and we won&apos;t pretend otherwise
            </Heading>
            <Body size="lg" className="mx-auto mt-6 max-w-2xl text-[var(--color-ink)]/80">
              A publisher that accepts every manuscript isn&apos;t really publishing —
              it&apos;s printing. We turn down most of what we receive, not because
              we&apos;re precious about it, but because every book we put our name on
              affects the next author&apos;s decision to trust us with theirs. If a
              manuscript isn&apos;t there yet, we&apos;ll tell you what&apos;s missing.
              If it&apos;s not for us at all, we&apos;ll tell you that too.
            </Body>
            <Link
              href="/standards"
              className="mt-6 inline-block font-medium text-[var(--color-primary)] hover:underline"
            >
              Read our editorial standards
            </Link>
          </Container>
        </Section>

        {/* Authors */}
        <Section>
          <Container>
            <Label as="span" className="text-[var(--color-accent)]">BUILT HERE</Label>
            <Heading as="h2" size="h2" className="mt-2">
              Authors
            </Heading>
            <Grid cols={4} gap="md" className="mt-10">
              {homeAuthors.map((author) => (
                <AuthorCard key={author.slug} author={author} />
              ))}
            </Grid>
          </Container>
        </Section>

        {/* Blog Teaser */}
        <Section className="bg-[var(--color-ink)]/[0.03]">
          <Container>
            <Label as="span" className="text-[var(--color-accent)]">READING & WRITING</Label>
            <Heading as="h2" size="h2" className="mt-2">
              From the desk
            </Heading>
            <Grid cols={3} gap="lg" className="mt-10">
              {recentPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </Grid>
          </Container>
        </Section>

        {/* Footer */}
        <footer className="border-t border-[var(--color-ink)]/10">
          <Container>
            <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-3 md:grid-cols-5">
              {FOOTER_COLUMNS.map((column) => (
                <nav key={column.heading} aria-label={column.heading}>
                  <Label as="span" className="text-[var(--color-ink)]/50">
                    {column.heading}
                  </Label>
                  <ul className="mt-3 flex flex-col gap-2">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-sm text-[var(--color-ink)]/80 hover:underline"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}

              <nav aria-label="Social">
                <Label as="span" className="text-[var(--color-ink)]/50">
                  Social
                </Label>
                <ul className="mt-3 flex flex-col gap-2">
                  <li>
                    <a
                      href="#"
                      className="text-sm text-[var(--color-ink)]/80 hover:underline"
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-sm text-[var(--color-ink)]/80 hover:underline"
                    >
                      X (Twitter)
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-sm text-[var(--color-ink)]/80 hover:underline"
                    >
                      LinkedIn
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--color-ink)]/10 py-6 sm:flex-row sm:items-center sm:justify-between">
              <a
                href="https://kekere.narriva.com"
                className="text-sm text-[var(--color-ink)]/70 underline"
              >
                Looking for short fiction? Visit Kekere Stories
              </a>
            </div>

            <div className="border-t border-[var(--color-ink)]/10 py-4">
              <p className="text-xs text-[var(--color-ink)]/50">
                Narriva is a selective publisher. We read everything we accept and
                decline far more than we publish.
              </p>
            </div>
          </Container>
        </footer>
      </main>
    </NarrivaTheme>
  );
}
