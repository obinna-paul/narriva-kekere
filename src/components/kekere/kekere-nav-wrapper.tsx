import { KekereNav } from "@/components/kekere/kekere-nav";
import { getCurrentSession } from "@/lib/auth/middleware";

export async function KekereNavWrapper() {
  const session = await getCurrentSession();
  const user = session?.user?.name
    ? { name: session.user.name, email: session.user.email ?? undefined }
    : null;

  return <KekereNav user={user} />;
}
