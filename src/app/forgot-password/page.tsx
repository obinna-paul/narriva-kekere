import { Suspense } from "react";
import { KekereTheme } from "@/components/theme";
import { ForgotPasswordForm } from "@/components/kekere/forgot-password-form";

export const metadata = {
  title: "Forgot password — Kekere Stories",
};

export default function ForgotPasswordPage() {
  return (
    <KekereTheme>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[#7A3415] to-[#2A1A12]">
          <span className="absolute left-[22px] top-[22px] font-[family-name:var(--font-display)] text-[22px] font-semibold text-white">
            Kekere
          </span>
        </div>
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </main>
    </KekereTheme>
  );
}
