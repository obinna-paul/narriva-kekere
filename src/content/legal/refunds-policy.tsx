import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

/** One shared policy covering both products — accounts and payments are
 * platform-wide, so a reader should see the full picture regardless of
 * which brand's footer link they clicked. */
export function RefundsPolicy() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" lastUpdated="June 23, 2026">
      <LegalSection heading="Narriva — books">
        <LegalList
          items={[
            "Ebook purchases are non-refundable once the purchase is complete — buying a book unlocks reading access immediately, with nothing left to \"return.\"",
            "Publishing service deposits (editorial, design, ghostwriting, etc.) are non-refundable once work has commenced. If you cancel before work begins, any deposit paid is refunded in full.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Kekere — wallet & stories">
        <LegalList
          items={[
            "Cowrie wallet top-ups are non-refundable. Cowries are a virtual, in-platform currency, not cash, and cannot be exchanged back for money.",
            "Once a story is unlocked using cowries, that unlock is final — there are no refunds for unlocked stories, regardless of whether you finish reading them.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Disputed or fraudulent charges">
        <p>
          If you believe you&apos;ve been charged in error or without authorization, contact
          support immediately with your payment reference. We investigate every report
          and will refund confirmed errors or unauthorized charges.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
