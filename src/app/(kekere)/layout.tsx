import type { Metadata, Viewport } from "next";
import { KekereTheme } from "@/components/theme";
import { PwaRegister } from "@/components/kekere/pwa-register";
import { InstallPrompt } from "@/components/kekere/install-prompt";

// Scoped to this route group only — Next merges per-segment metadata up to
// the real <head>, so the manifest link (and everything else here) only
// ever renders on Kekere pages, never on Narriva or admin routes.
export const metadata: Metadata = {
  manifest: "/kekere/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kekere",
  },
};

export const viewport: Viewport = {
  themeColor: "#C75D2C",
  viewportFit: "cover",
};

export default function KekereLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Kekere-specific theme classes are applied here only — never at the root layout.
  return (
    <div className="bg-kekere-bg text-kekere-ink font-body">
      <PwaRegister />
      <InstallPrompt />
      {children}
    </div>
  );
}
