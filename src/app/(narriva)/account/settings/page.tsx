import { redirect } from "next/navigation";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";

export const dynamic = "force-dynamic";

// Account settings are shared across both brands — Narriva and Kekere log
// into the same User record — so this page works regardless of which
// product a user came from. Auth protection lives in src/middleware.ts.
export default async function AccountSettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login?callbackUrl=/account/settings");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, deletionRequestedAt: true },
  });
  if (!user) redirect("/login");

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <Heading as="h1" size="h1">
              Account settings
            </Heading>
            <Body size="lg" className="mt-3 text-[var(--color-ink)]/70">
              {user.name} · {user.email}
            </Body>

            <div className="mt-10">
              <Heading as="h2" size="h4" className="mb-4 text-red-700">
                Danger zone
              </Heading>
              <DeleteAccountSection
                initialDeletionRequestedAt={user.deletionRequestedAt?.toISOString() ?? null}
              />
            </div>
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
