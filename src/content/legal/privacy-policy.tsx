import Link from "next/link";
import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

export interface PrivacyPolicyProps {
  brand: "Narriva" | "Kekere";
}

const LAWYER_NOTICE =
  "This policy should be reviewed by a qualified lawyer before the platform processes real user data in production.";

export function PrivacyPolicy({ brand }: PrivacyPolicyProps) {
  const otherBrand = brand === "Narriva" ? "Kekere" : "Narriva";

  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 23, 2026" notice={LAWYER_NOTICE}>
      <LegalSection heading="1. Who this policy covers">
        <p>
          {brand} and {otherBrand} are run on the same underlying platform and share one
          account system — if you have an account with one, the data practices described
          here apply to both. This policy explains what we collect, why, and what rights
          you have over it.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <p>We collect the following categories of information:</p>
        <LegalList
          items={[
            "Account information: your name, email address, and password (stored as a salted hash, never in plain text).",
            "Payment information: when you buy a book, top up a wallet, or pay for a publishing service, our payment processor (Paystack) handles your card details directly — we never see or store your full card number. We retain the transaction reference and amount for our own records.",
            brand === "Narriva"
              ? "Reading and purchase activity: which books you've bought, your reading progress within them, and your submission history if you're an author."
              : "Reading and writing activity: which stories you've read, unlocked, saved, or written, your cowrie wallet balance and transaction history, and competition entries.",
            "Technical data: IP address, browser type, and basic usage analytics, collected automatically when you use the site.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <p>We use the information above to:</p>
        <LegalList
          items={[
            "Create and manage your account, and authenticate you when you log in.",
            "Process payments and deliver the content or service you've paid for.",
            "Track reading/writing progress so the app can pick up where you left off.",
            "Send you transactional emails (purchase confirmations, submission updates, account notices).",
            "Send you marketing emails about new releases, competitions, or features — only if you've opted in, and you can unsubscribe at any time.",
            "Detect and prevent fraud, abuse, and security incidents.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Who we share your information with">
        <p>
          We don&apos;t sell your personal data. We share limited information with the
          following third-party service providers, strictly to operate the platform:
        </p>
        <LegalList
          items={[
            "Paystack — processes payments for book purchases, wallet top-ups, and publishing services. Paystack receives your payment details directly; we receive only a transaction reference and status.",
            "Resend — sends transactional and marketing emails on our behalf. Resend receives your email address and the content of the email being sent.",
            "Cloudflare R2 — stores ebook content, submitted manuscripts, and other file uploads. Files are stored privately and are not publicly accessible.",
          ]}
        />
        <p>
          We may also disclose information if required by law, or to protect the rights,
          property, or safety of {brand}, our users, or the public.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We retain your account data for as long as your account is active. Financial
          records (orders, transactions, submission records) are retained for at least 7
          years to meet legal and tax obligations, even after an account is deleted. Other
          personal data is deleted within 30 days of a confirmed deletion request — see
          your account deletion rights below.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>You have the right to:</p>
        <LegalList
          items={[
            "Access the personal data we hold about you.",
            "Correct inaccurate or incomplete data (most of this you can edit directly in your profile).",
            "Request deletion of your account and personal data — you can start this from your account settings.",
            "Withdraw consent to marketing emails at any time.",
          ]}
        />
        <p>
          To request deletion, go to{" "}
          <Link href="/account/settings" className="text-[var(--color-primary)] underline">
            Account settings
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookies and tracking">
        <p>
          We use essential cookies to keep you logged in and to remember basic preferences
          (like your reading settings). We use lightweight, privacy-respecting analytics
          to understand how the site is used in aggregate — this does not involve
          cross-site tracking or selling data to advertisers.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about this policy or your data can be sent to our support address
          listed on the site.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
