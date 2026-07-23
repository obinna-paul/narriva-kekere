import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface ContractSignedEmailProps {
  writerName: string;
  storyTitle: string;
  signedAt: string;
  storyUrl?: string;
  pdfAttached?: boolean;
  /** True only for writers whose story goes live immediately on signing
   * (onboarded/admin-authored). Everyone else lands in the ACCEPTED "to be
   * published" queue — the copy and CTA below must not claim the story is
   * live when it isn't. */
  isLive: boolean;
}

export function ContractSignedEmail({
  writerName,
  storyTitle,
  signedAt,
  storyUrl = "https://narriva.pro/kekere",
  pdfAttached = true,
  isLive,
}: ContractSignedEmailProps) {
  return (
    <BaseEmail
      preview={
        isLive
          ? `Your story "${storyTitle}" is now live on Kekere Stories`
          : `Your contract for "${storyTitle}" is signed`
      }
    >

      <Text style={styles.h1}>{isLive ? "Your story is live 🎉" : "Your contract is signed"}</Text>

      <Text style={styles.p}>
        {isLive ? (
          <>
            Hi {writerName}, you signed your publishing contract on {signedAt} and your story{" "}
            <strong>&ldquo;{storyTitle}&rdquo;</strong> is now live on Kekere Stories.
          </>
        ) : (
          <>
            Hi {writerName}, you signed your publishing contract on {signedAt}.{" "}
            <strong>&ldquo;{storyTitle}&rdquo;</strong> is now in our publishing queue, where our editors will
            prepare it for release.
          </>
        )}
      </Text>

      <Text style={styles.p}>
        {isLive
          ? "Readers can find it in the feed right now. Every time someone unlocks your story, 70% of the cowrie payment comes directly to your writer wallet."
          : "We'll email you the moment it's live, with a link you can share. If our editors have any changes to suggest first, you'll get a chance to review them."}
      </Text>

      {/* Signed confirmation block */}
      <Section style={{
        backgroundColor: "#F6FBF8",
        borderRadius: 12,
        border: "1px solid rgba(31,138,91,0.18)",
        padding: "18px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#1F8A5B", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          Contract signed
        </Text>
        <Text style={{ margin: 0, fontSize: 14, color: "#2A1A12", lineHeight: "1.6" }}>
          {pdfAttached
            ? "A signed copy of your publishing agreement is attached to this email — keep it for your records."
            : isLive
              ? "Your contract has been signed and your story is now live. A copy of your publishing agreement will be available in your dashboard."
              : "Your contract has been signed. A copy of your publishing agreement will be available in your dashboard."}
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Link href={storyUrl} style={styles.button()}>
          {isLive ? "See your story on Kekere →" : "Track your publishing progress →"}
        </Link>
      </Section>

      <Text style={styles.muted}>
        Thank you for publishing with Kekere Stories, an imprint of Narriva Publishing.
      </Text>

    </BaseEmail>
  );
}
