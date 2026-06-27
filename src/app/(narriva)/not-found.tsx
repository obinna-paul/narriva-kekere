import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";

export default function NarrivaNotFound() {
  return (
    <NarrivaTheme>
      {/* Self-sufficient background/font — this renders both wrapped by
          (narriva)/layout.tsx (an in-app notFound() call) and unwrapped, via
          the root app/not-found.tsx fallback for a genuinely unmatched URL,
          which never reaches that layout at all. */}
      <main className="flex min-h-screen items-center justify-center bg-narriva-bg px-8 py-[60px] font-body text-narriva-ink">
        <div className="max-w-[600px] text-center">
          <div className="mx-auto mb-[34px] h-px w-10 bg-[var(--color-accent)]" />
          <h1 className="font-[family-name:var(--font-display)] text-[52px] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--color-ink)]">
            This page seems to be missing a chapter.
          </h1>
          <p className="mx-auto mt-6 max-w-[440px] text-lg leading-[1.6] text-[var(--color-muted)]">
            It might have moved, or it may never have existed. Either way, here&apos;s
            where to go next.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            <Link
              href="/"
              className="border-b border-[var(--color-primary)]/30 text-[17px] font-medium text-[var(--color-primary)]"
            >
              Home
            </Link>
            <Link
              href="/books"
              className="border-b border-[var(--color-primary)]/30 text-[17px] font-medium text-[var(--color-primary)]"
            >
              Browse books
            </Link>
            <Link
              href="/submit"
              className="border-b border-[var(--color-primary)]/30 text-[17px] font-medium text-[var(--color-primary)]"
            >
              Submit your manuscript
            </Link>
          </div>
        </div>
      </main>
    </NarrivaTheme>
  );
}
