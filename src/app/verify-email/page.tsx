import { Suspense } from "react";
import { KekereTheme, NarrivaTheme } from "@/components/theme";
import { VerifyEmailForm } from "@/components/kekere/verify-email-form";

// Mirrors /login's brand split (src/app/login/page.tsx) — a Narriva signup
// lands here with ?brand=narriva (see auth-form.tsx), and this page used to
// always render the Kekere banner regardless, so a Narriva reader waiting
// for their code saw an unfamiliar "Kekere" header that gave no visual
// confirmation they were in the right place.
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { brand?: string };
}) {
  const isNarriva = searchParams.brand === "narriva";

  if (isNarriva) {
    return (
      <NarrivaTheme>
        <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
          <div className="relative h-[180px] overflow-hidden bg-[var(--color-primary)]">
            <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-medium text-white">
              Narriva
            </span>
          </div>
          <Suspense>
            <VerifyEmailForm />
          </Suspense>
        </main>
      </NarrivaTheme>
    );
  }

  return (
    <KekereTheme>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[#7A3415] to-[#2A1A12]">
          <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">
            Kekere
          </span>
        </div>
        <Suspense>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </KekereTheme>
  );
}
