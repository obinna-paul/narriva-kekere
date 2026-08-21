import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/kekere/pwa-register";
import { InstallPrompt } from "@/components/kekere/install-prompt";
import { JsonLd } from "@/components/seo/json-ld";
import { webSiteSchema } from "@/lib/seo/schema";
import { KekerePulseProvider } from "@/components/kekere/pulse-provider";

const DESCRIPTION =
  "Kekere Stories is the home for short fiction by African writers. We're always eager to publish fresh voices and outstanding storytelling, and we run special short story prizes four times a year.";

// Scoped to this route group only — Next merges per-segment metadata up to
// the real <head>, so the manifest link (and everything else here) only
// ever renders on Kekere pages, never on Narriva or admin routes.
export const metadata: Metadata = {
  title: { default: "Kekere Stories | Short Fiction", template: "%s | Kekere Stories" },
  description: DESCRIPTION,
  manifest: "/kekere/manifest.webmanifest",
  // Explicit icons here replace (rather than merge with) the root layout's
  // Narriva favicon.ico for every page under this route group — the Kekere
  // "K" mark, not Narriva's, is what a Kekere browser tab shows.
  icons: {
    icon: "/kekere/icons/icon-192.png",
    shortcut: "/kekere/icons/icon-192.png",
    apple: "/kekere/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kekere",
  },
  openGraph: {
    siteName: "Kekere Stories",
    type: "website",
    locale: "en_NG",
    title: "Kekere Stories | Short Fiction",
    description: DESCRIPTION,
    images: [`/api/og?brand=kekere&title=${encodeURIComponent("Kekere Stories")}`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kekere Stories | Short Fiction",
    description: DESCRIPTION,
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
    <div className="bg-[var(--color-bg)] text-[var(--color-ink)] font-body">
      <JsonLd data={webSiteSchema("kekere")} />
      <PwaRegister />
      <InstallPrompt />
      {/* One poll for the notification badge and Kemi's unread dot together —
          they used to run separate 60s intervals. Sits at the layout so both
          the nav and the feed read the same numbers. */}
      <KekerePulseProvider>{children}</KekerePulseProvider>
    </div>
  );
}
