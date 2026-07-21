import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, EB_Garamond } from "next/font/google";
import "@/styles/globals.css";
import { SITE_URL } from "@/content/decisions";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Base for every relative canonical/OG/image URL set anywhere in the app —
// (narriva)/layout.tsx and (kekere)/layout.tsx set the real per-brand
// title/description/OG defaults; this is only the neutral fallback used if
// neither segment overrides it (shouldn't happen in practice).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Narriva & Kekere Stories",
  description: "Narriva and Kekere Stories",
  // Explicit (not the special app/favicon.ico file convention, which Next
  // always injects globally regardless of any nested override — see the
  // (kekere) layout's own `icons` for why this had to move here). This is
  // the shared default for Narriva pages and anything outside both brand
  // route groups (admin, auth); (kekere)/layout.tsx overrides it for every
  // Kekere page via normal metadata cascading.
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q9KTKCQ0V0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Q9KTKCQ0V0');
            `,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable} ${ebGaramond.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
