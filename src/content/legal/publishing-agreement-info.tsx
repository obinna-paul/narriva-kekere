import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

const NOTICE =
  "This page describes what our Publishing Agreement covers. It is not the agreement itself and has no legal effect — the actual contract is provided and signed separately with each accepted author, and has been reviewed by legal counsel.";

export function PublishingAgreementInfo() {
  return (
    <LegalLayout title="Publishing Agreement — Overview" lastUpdated="June 23, 2026" notice={NOTICE}>
      <LegalSection heading="What this page is">
        <p>
          When Narriva accepts a manuscript for publication, the author signs a separate,
          individually reviewed Publishing Agreement before any work begins. This page is
          a plain-language checklist of what that real contract will cover — nothing
          below is binding, and none of it should be treated as legal advice or as the
          terms of any actual deal.
        </p>
      </LegalSection>

      <LegalSection heading="What the real contract will cover">
        <LegalList
          items={[
            "Grant of publishing rights — which specific rights the author licenses to Narriva (e.g. ebook publication, distribution), and which rights the author keeps.",
            "Territory and term — where the agreement applies and for how long.",
            "Editorial approval rights — who has final say over edits, and how disagreements are resolved.",
            "Advance and royalty split — any upfront payment, the royalty percentage, and the payment schedule.",
            "Cover design approval — whether the author has approval rights over the final cover.",
            "Marketing obligations — what promotional commitments, if any, the author and Narriva each take on.",
            "Copyright and credit — confirmation that the author is credited as the copyright holder, with Narriva's license being just that — a license, not a transfer.",
            "Rights reversion — the conditions under which publishing rights revert back to the author (e.g. after the book goes out of print, or after a fixed term).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What happens next">
        <p>
          If your manuscript is accepted, our editorial team will send you the actual
          Publishing Agreement directly, along with time to review it — including with
          your own legal counsel — before signing.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
