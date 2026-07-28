import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WriterContentGuide } from "@/content/legal/writer-content-guide";

export const metadata = {
  title: "Story Guidelines",
  description: "What Kekere is looking for in a submission, what we don't publish, and our policy on AI.",
  alternates: { canonical: "/kekere/content-guide" },
};

// Opened in a new tab from the writer editor and the "your stories" screen —
// deliberately not auth-gated, same as /kekere/terms and /kekere/privacy, so
// a prospective writer can read it before ever creating an account.
export default function KekereContentGuidePage() {
  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] pb-[calc(80px+env(safe-area-inset-bottom))]">
        <KekereNavWrapper />
        <WriterContentGuide />
      </div>
    </KekereTheme>
  );
}
