import Link from "next/link";
import { KekereTheme } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default function KekereNotFound() {
  return (
    <KekereTheme>
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center text-[var(--color-ink)]">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-primary)]">404</p>
        <h1 className="text-2xl font-bold">That story isn&apos;t here</h1>
        <p className="max-w-xs text-sm text-[var(--color-ink)]/60">
          It might have moved, or the link&apos;s a bit off.
        </p>
        <Link href="/kekere/feed" className={cn(buttonVariants({ size: "lg" }), "mt-3 rounded-full px-8")}>
          Back to the feed
        </Link>
      </main>
    </KekereTheme>
  );
}
