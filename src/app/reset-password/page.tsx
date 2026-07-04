import { Suspense } from "react";
import { KekereTheme } from "@/components/theme";
import { ResetPasswordForm } from "@/components/kekere/reset-password-form";

export const metadata = {
  title: "Reset password — Kekere Stories",
};

export default function ResetPasswordPage() {
  return (
    <KekereTheme>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[#7A3415] to-[#2A1A12]">
          <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">
            Kekere
          </span>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </KekereTheme>
  );
}
