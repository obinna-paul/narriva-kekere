import Link from "next/link";
import { KekereTheme } from "@/components/theme";

const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function KekereNotFound() {
  return (
    <KekereTheme>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#2A1A12] px-6 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${GRAIN_SVG}")`,
            opacity: 0.1,
            mixBlendMode: "overlay",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[-5%] top-[-10%] h-[70%] w-[60%]"
          style={{
            background:
              "radial-gradient(closest-side,rgba(199,93,44,0.35),rgba(199,93,44,0))",
          }}
        />

        <div className="relative max-w-[420px] text-center">
          <p className="mb-[30px] font-[family-name:var(--font-display)] text-[21px] font-semibold text-[var(--color-sand-accent-2)]">
            Kekere
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(34px,6vw,46px)] font-semibold leading-[1.12] text-[var(--color-primary)]">
            This story has gone missing.
          </h1>
          <p className="mt-5 text-base leading-[1.6] text-[rgba(245,235,221,0.72)]">
            It might have been removed, or the link was wrong. Either way, there
            are better ones waiting.
          </p>
          <Link
            href="/kekere/feed"
            className="mt-8 inline-block rounded-[10px] bg-[var(--color-primary)] px-[34px] py-[15px] text-base font-semibold text-white shadow-[0_12px_30px_-10px_rgba(199,93,44,0.6)] transition-colors hover:bg-[var(--color-primary-light)]"
          >
            Back to the feed
          </Link>
        </div>
      </main>
    </KekereTheme>
  );
}
