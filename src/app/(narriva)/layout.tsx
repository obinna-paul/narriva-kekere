import { NarrivaTheme } from "@/components/theme";
import { NariWidget } from "@/components/narriva/nari-widget";
import { NarrivaFooter } from "@/components/narriva/narriva-footer";
import { NarrivaNav } from "@/components/narriva/narriva-nav";
import { getCurrentSession } from "@/lib/auth/middleware";

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
