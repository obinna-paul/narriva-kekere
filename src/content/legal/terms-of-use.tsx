import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

export interface TermsOfUseProps {
  brand: "Narriva" | "Kekere";
}

const LAWYER_NOTICE =
  "This policy should be reviewed by a qualified lawyer before the platform processes real user data in production.";

export function TermsOfUse({ brand }: TermsOfUseProps) {
  return (
    <LegalLayout title="Terms of Use" lastUpdated="June 23, 2026" notice={LAWYER_NOTICE}>
      <LegalSection heading="1. Eligibility">
        <p>
          You must be at least 16 years old to create an account.{" "}
          <strong>
            This minimum age is a placeholder decision flagged for confirmation before
            launch — given that {brand === "Kekere" ? "Kekere" : "the platform"} hosts
            user-submitted fiction that may include mature themes, raising this to 18+
            for account creation (or adding mature-content gating independent of account
            age) should be confirmed with legal counsel before going live.
          </strong>
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You&apos;re responsible for keeping your login credentials confidential and for all
          activity that happens under your account. Tell us immediately if you suspect
          unauthorized access.
        </p>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <p>By using {brand}, you agree not to:</p>
        <LegalList
          items={[
            "Upload or submit content you don't have the right to share, including plagiarized work.",
            "Attempt to bypass payment, unlock, or access controls (including scraping, automated downloading, or sharing account credentials).",
            "Harass, defame, or impersonate other users.",
            "Use the platform for any unlawful purpose.",
          ]}
        />
        <p>
          We may suspend or terminate accounts that violate these terms, including
          confirmed cases of plagiarism — see our{" "}
          <a href="/copyright" className="text-[var(--color-primary)] underline">
            Copyright Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="4. Content ownership">
        {brand === "Kekere" ? (
          <>
            <p>
              You retain full ownership of the stories you write and publish on Kekere. By
              publishing a story, you grant Kekere a non-exclusive, worldwide license to
              host, display, and distribute that content within the platform (including
              competition pages and promotional features) for as long as it remains
              published. You can unpublish your work at any time, which ends that license
              going forward.
            </p>
            <p>
              This mirrors how Narriva&apos;s published authors retain authorship and
              underlying rights to their books while granting Narriva the specific rights
              described in their individual Publishing Agreement.
            </p>
          </>
        ) : (
          <>
            <p>
              Authors retain ownership of their work. The specific rights granted to
              Narriva to edit, publish, and distribute an accepted manuscript are set out
              in that author&apos;s individual, signed Publishing Agreement — not in these
              Terms of Use. See our{" "}
              <a href="/publishing-agreement-info" className="text-[var(--color-primary)] underline">
                Publishing Agreement overview
              </a>
              .
            </p>
            <p>
              Everything else on the site — our branding, design, editorial copy, and
              platform code — belongs to Narriva and may not be reproduced without
              permission.
            </p>
          </>
        )}
      </LegalSection>

      <LegalSection heading="5. Termination">
        <p>
          You may stop using the platform and request account deletion at any time. We
          may suspend or terminate your access if you violate these terms, without
          refunding any non-refundable purchases (see our{" "}
          <a href="/refunds" className="text-[var(--color-primary)] underline">
            Refund &amp; Cancellation Policy
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitation of liability">
        <p>
          The platform is provided &quot;as is.&quot; To the maximum extent permitted by law, we
          are not liable for indirect, incidental, or consequential damages arising from
          your use of the platform, including loss of data, revenue, or opportunity.
        </p>
      </LegalSection>

      <LegalSection heading="7. Governing law and disputes">
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. Any
          dispute arising from these terms will be subject to the exclusive jurisdiction
          of the courts of Nigeria.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use of the platform
          after a change means you accept the updated terms.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
