import { KekereTheme } from "@/components/theme";
import { KekereFooter } from "@/components/kekere/kekere-footer";

export default function KekereLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Kekere-specific theme classes are applied here only — never at the root layout.
  return (
    <div className="bg-kekere-bg text-kekere-ink font-body">
      {children}
      {/* Each page already wraps its own content in KekereTheme; this just
          gives the site-wide legal footer the same CSS variables without
          touching any existing page's wrapping. */}
      <KekereTheme>
        <KekereFooter />
      </KekereTheme>
    </div>
  );
}
