import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "@/styles/globals.css";

// Both brands use these fonts independently — that is a practical engineering
// choice, not a shared visual identity. Each brand's layout decides how (or
// whether) to apply them; this root layout does not impose any brand styling.
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

export const metadata: Metadata = {
  title: "Narriva",
  description: "Narriva and Kekere Stories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
