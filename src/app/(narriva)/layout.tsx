import { NarrivaTheme } from "@/components/theme";
import { NariWidget } from "@/components/narriva/nari-widget";
import { NarrivaFooter } from "@/components/narriva/narriva-footer";
import { NarrivaNav } from "@/components/narriva/narriva-nav";
import { getCurrentSession } from "@/lib/auth/middleware";
import Script from "next/script";

export default async function NarrivaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  const navUser = session?.user?.name
    ? { name: session.user.name, email: session.user.email ?? undefined }
    : null;

  // Narriva-specific theme classes are applied here only — never at the root layout.
  return (
    <div className="bg-narriva-bg text-narriva-ink font-body">
      {/* Each page already wraps its own content in NarrivaTheme; this just
          gives the site-wide nav/widget/footer the same CSS variables
          without touching any existing page's wrapping. */}
      <NarrivaTheme>
        <NarrivaNav user={navUser} />
      </NarrivaTheme>
      {children}
      <NarrivaTheme>
        <NariWidget />
        <NarrivaFooter />
      </NarrivaTheme>
      {process.env.NEXT_PUBLIC_CALENDLY_URL && (
        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="lazyOnload"
        />
      )}
    </div>
  );
}
