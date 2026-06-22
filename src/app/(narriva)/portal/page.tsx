import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { Container, Section } from "@/components/ui/layout";
import { Heading, Body } from "@/components/ui/typography";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getSubmissionsForUser } from "@/lib/data/submissions";
import { SubmissionStatusCard } from "@/components/narriva/submission-status-card";
import { SubmissionStageTracker } from "@/components/narriva/submission-stage-tracker";
import { CommunicationLog } from "@/components/narriva/communication-log";

export const dynamic = "force-dynamic";

// Auth protection for /portal lives in src/middleware.ts (redirects
// logged-out visitors to /login). This still reads the session itself
// because it needs the user's id to fetch their submissions, not just to
// gate access.
export default async function AuthorPortalPage() {
  const session = await getCurrentSession();
  const submissions = session?.user?.id
    ? await getSubmissionsForUser(session.user.id)
    : [];

  return (
    <NarrivaTheme>
      <main>
        <Section>
          <Container size="md">
            <Heading as="h1" size="h1">
              Author Portal
            </Heading>
            <Body size="lg" className="mt-4 text-[var(--color-ink)]/80">
              Track your manuscript from submission through launch.
            </Body>

            {submissions.length === 0 ? (
              <Card className="mt-10">
                <CardBody className="text-center">
                  <Body size="base" className="text-[var(--color-ink)]/70">
                    You haven&apos;t submitted a manuscript yet.
                  </Body>
                  <Link href="/submit" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
                    Submit your manuscript
                  </Link>
                </CardBody>
              </Card>
            ) : (
              <div className="mt-10 flex flex-col gap-10">
                {submissions.map((submission) =>
                  submission.status === "ACCEPTED" ? (
                    <Card key={submission.id}>
                      <CardBody className="flex flex-col gap-8">
                        <div>
                          <Heading as="h2" size="h3">
                            {submission.manuscriptTitle}
                          </Heading>
                          <Body size="sm" className="mt-1 text-[var(--color-ink)]/60">
                            Accepted — now in production
                          </Body>
                        </div>
                        <SubmissionStageTracker
                          currentStage={submission.currentStage ?? "SUBMITTED"}
                        />
                        <CommunicationLog
                          updates={submission.updates}
                          reviewerNotes={submission.reviewerNotes}
                        />
                      </CardBody>
                    </Card>
                  ) : (
                    <SubmissionStatusCard key={submission.id} submission={submission} />
                  )
                )}
              </div>
            )}
          </Container>
        </Section>
      </main>
    </NarrivaTheme>
  );
}
