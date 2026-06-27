import { LegalLayout, LegalSection, LegalList } from "@/components/legal/legal-layout";

/** Platform-wide — covers Kekere submissions specifically, since that's
 * where user-generated content (and plagiarism risk) lives. */
export function CopyrightPolicy() {
  return (
    <LegalLayout title="Copyright & IP Policy" lastUpdated="June 23, 2026">
      <LegalSection heading="1. Ownership of submitted work">
        <p>
          Writers retain ownership of the stories they submit to Kekere. Submitting a
          story for moderation, publication, or a competition does not transfer
          copyright — see the content ownership section of our{" "}
          <a href="/terms" className="text-[var(--color-primary)] underline">
            Terms of Use
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="2. Plagiarism policy">
        <p>
          Every submission goes through moderation before publication. Submissions can be
          flagged for suspected plagiarism during this review — flagged stories are held
          and not published until reviewed.
        </p>
        <LegalList
          items={[
            "If a flag is confirmed, the story is removed (or never published) and the author is notified with the reason.",
            "A confirmed first offense results in the story's removal and a formal warning.",
            "Repeated or severe confirmed plagiarism results in account suspension or termination, at our discretion.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. Copyright infringement claims (takedown process)">
        <p>
          If you believe a story published on Kekere infringes your copyright, send a
          takedown request to our support address including:
        </p>
        <LegalList
          items={[
            "Identification of the copyrighted work you claim is infringed.",
            "The URL or title of the story you believe infringes it.",
            "Your contact information and a statement that you have a good-faith belief the use is unauthorized.",
          ]}
        />
        <p>
          We review every claim and will remove or restrict access to content found to be
          infringing. The author of the affected story will be notified and given an
          opportunity to respond.
        </p>
      </LegalSection>

      <LegalSection heading="4. Counter-notices">
        <p>
          If your story was removed following a takedown request and you believe this was
          done in error, you can submit a counter-notice explaining why. We&apos;ll review it
          and may restore the content if the claim is unsubstantiated.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
