import { NarrivaTheme } from "@/components/theme";
import { NariWidget } from "@/components/narriva/nari-widget";

export default function NarrivaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Narriva-specific theme classes are applied here only — never at the root layout.
  return (
    <div className="bg-narriva-bg text-narriva-ink font-body">
      {children}
      {/* Each page already wraps its own content in NarrivaTheme; this just
          gives the site-wide widget the same CSS variables without touching
          any existing page's wrapping. */}
      <NarrivaTheme>
        <NariWidget />
      </NarrivaTheme>
    </div>
  );
}
