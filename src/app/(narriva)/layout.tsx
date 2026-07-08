import type { Metadata } from "next";
import { NarrivaTheme } from "@/components/theme";
import { NariWidget } from "@/components/narriva/nari-widget";
import { NarrivaFooter } from "@/components/narriva/narriva-footer";
import { NarrivaNav } from "@/components/narriva/narriva-nav";
import { getCurrentSession } from "@/lib/auth/middleware";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema } from "@/lib/seo/schema";

const DESCRIPTION =
  "Narriva is a publishing house for authors at every stage: from a rough idea on your mind to a polished book on the shelves.";

// Scoped to this route group only — never leaks onto Kekere or admin pages
// (Next merges per-segment metadata up to the real <head>).
export const metadata: Metadata = {
  title: { default: "Narriva", template: "%s | Narriva" },
  description: DESCRIPTION,
  openGraph: {
    siteName: "Narriva",
    type: "website",
    locale: "en_NG",
    title: "Narriva",
    description: DESCRIPTION,
    images: [`/api/og?brand=narriva&title=${encodeURIComponent("Narriva")}`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Narriva",
    description: DESCRIPTION,
  },
};

export default async function NarrivaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  const navUser = session?.user?.name
    ? { name: session.user.name, email: session.user.email ?? undefined }
    : null;

  return (
    <div className="bg-narriva-bg text-narriva-ink font-body">
      <JsonLd data={organizationSchema()} />
      <NarrivaTheme>
        <NarrivaNav user={navUser} />
      </NarrivaTheme>
      {children}
      <NarrivaTheme>
        <NariWidget />
        <NarrivaFooter />
      </NarrivaTheme>
    </div>
  );
}
