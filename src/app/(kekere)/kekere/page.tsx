import Link from "next/link";
import { KekereTheme } from "@/components/theme";
import { Heading, Body } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { StoryCard } from "@/components/kekere/story-card";
import { MOCK_STORIES } from "@/content/mock/kekere-stories";

const PREVIEW_STORIES = MOCK_STORIES.slice(0, 4);

const FOOTER_LINKS = [
  { label: "Submission guidelines", href: "/kekere/standards" },
  { label: "Competitions", href: "/kekere/competitions" },
  { label: "Contact", href: "/kekere/contact" },
];

export default function KekereLandingPage() {
  return (
    <KekereTheme>
      <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
        <section className="px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Heading as="h1" size="h1" className="text-balance">
              Kekere means small. The stories don&apos;t stay that way.
            </Heading>
            <Body size="lg" className="mx-auto mt-5 max-w-xl text-[var(--color-ink)]/75">
              Short fiction from new and emerging African writers — read in the time it
              takes to wait for a bus, finish a meal, or fall asleep. The best of what&apos;s
              here gets published. All of it is worth your ninety seconds.
            </Body>
            <Link
              href="/kekere/join"
              className={cn(buttonVariants({ size: "lg" }), "mt-7 rounded-full px-8")}
            >
              Join Kekere
            </Link>
          </div>
        </section>

        <section className="relative px-5 pb-16 sm:px-8">
          <div className="relative mx-auto max-h-[560px] max-w-5xl overflow-hidden rounded-3xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PREVIEW_STORIES.map((story, i) => (
                <div key={story.id} className={i > 0 ? "blur-sm" : undefined} aria-hidden={i > 0}>
                  <StoryCard story={story} />
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent">
              <div className="mt-24 flex flex-col items-center gap-3 text-center">
                <p className="max-w-xs text-sm font-medium text-[var(--color-ink)]/80">
                  Fifteen new stories a week. Join free to read them all.
                </p>
                <Link href="/kekere/join" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}>
                  Join Kekere
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--color-ink)]/10 px-5 py-8 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <nav aria-label="Footer" className="flex flex-wrap justify-center gap-4">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-[var(--color-ink)]/40">Part of the Narriva group</p>
          </div>
        </footer>
      </main>
    </KekereTheme>
  );
}
