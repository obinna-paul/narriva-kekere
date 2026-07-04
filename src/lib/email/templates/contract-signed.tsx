import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface ContractSignedEmailProps {
  writerName: string;
  storyTitle: string;
  signedAt: string;
  storyUrl?: string;
}

export function ContractSignedEmail({
  writerName,
  storyTitle,
  signedAt,
  storyUrl = "https://kekere.narriva.pro/kekere",
}: ContractSignedEmailProps) {
  return (
    <BaseEmail preview={`Your story "${storyTitle}" is now live on Kekere Stories`}>

      <Text style={styles.h1}>Your story is live 🎉</Text>

      <Text style={styles.p}>
        Hi {writerName}, you signed your publishing contract on {signedAt} and your story{" "}
        <strong>"{storyTitle}"</strong> is now live on Kekere Stories.
      </Text>

      <Text style={styles.p}>
        Readers can find it in the feed right now. Every time someone unlocks your story,
        70% of the cowrie payment comes directly to your writer wallet.
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
          A signed copy of your publishing agreement is attached to this email — keep it for your records.
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Link href={storyUrl} style={styles.button()}>
          See your story on Kekere →
        </Link>
      </Section>

      <Text style={styles.muted}>
        Thank you for publishing with Kekere Stories, an imprint of Narriva Publishing.
      </Text>

    </BaseEmail>
  );
}
