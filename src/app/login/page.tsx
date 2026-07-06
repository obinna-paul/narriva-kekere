import { Suspense } from "react";
import { KekereTheme, NarrivaTheme } from "@/components/theme";
import { KekereAuthForm } from "@/components/kekere/auth-form";
import { TermsOfUse } from "@/content/legal/terms-of-use";
import { getRandomKekereLoginQuote } from "@/content/kekere-login-quotes";

export const dynamic = "force-dynamic";

const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { brand?: string; callbackUrl?: string; mode?: string };
}) {
  const isNarriva = searchParams.brand === "narriva";
  const loginQuote = getRandomKekereLoginQuote();

  if (isNarriva) {
    return (
      <NarrivaTheme>
        <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
          <div className="relative h-[220px] overflow-hidden bg-[var(--color-primary)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url("${GRAIN_SVG}")`,
                opacity: 0.1,
                mixBlendMode: "overlay",
              }}
            />
            <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-medium text-white">
              Narriva
            </span>
            <div className="absolute bottom-[22px] left-[22px] right-[22px]">
              <p className="font-[family-name:var(--font-display)] text-[22px] font-medium italic leading-[1.25] text-[rgba(255,255,255,0.9)]">
                &ldquo;Your book deserves to exist. Let&apos;s make it happen.&rdquo;
              </p>
            </div>
          </div>
          <Suspense>
            <KekereAuthForm brand="narriva" termsContent={<TermsOfUse brand="Narriva" />} />
          </Suspense>
        </main>
      </NarrivaTheme>
    );
  }

  return (
    <KekereTheme>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="relative h-[240px] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[#7A3415] to-[#2A1A12]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${GRAIN_SVG}")`,
              opacity: 0.12,
              mixBlendMode: "overlay",
            }}
          />
          <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">
            Kekere
          </span>
          <div className="absolute bottom-[22px] left-[22px] right-[22px]">
            <p className="font-[family-name:var(--font-display)] text-[22px] font-semibold italic leading-[1.25] text-[var(--color-cream)]">
              &ldquo;{loginQuote}&rdquo;
            </p>
          </div>
        </div>

        <Suspense>
          <KekereAuthForm termsContent={<TermsOfUse brand="Kekere" />} />
        </Suspense>
      </main>
    </KekereTheme>
  );
}
