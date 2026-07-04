import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface StoryAcceptedEmailProps {
  writerName: string;
  storyTitle: string;
  cowrieCost: number;
  writerSharePercent?: number;
  expiresInDays: number;
  contractUrl?: string;
}

export function StoryAcceptedEmail({
  writerName,
  storyTitle,
  cowrieCost,
  writerSharePercent = 70,
  expiresInDays,
  contractUrl = "https://kekere.narriva.pro/kekere/contracts",
}: StoryAcceptedEmailProps) {
  return (
    <BaseEmail preview={`"${storyTitle}" has been accepted for publishing on Kekere Stories`}>

      <Text style={{ ...styles.h1, marginBottom: 4 }}>Your story is accepted</Text>
      <Text style={{ ...styles.muted, marginBottom: 20 }}>Publishing contract ready to sign</Text>

      <Text style={styles.p}>
        Hi {writerName}, great news — your story <strong>"{storyTitle}"</strong> has been accepted
        for publishing on Kekere Stories, an imprint of Narriva Publishing.
      </Text>

      {/* Terms summary */}
      <Section style={{
        backgroundColor: "#F6FBF8",
        borderRadius: 12,
        border: "1px solid rgba(31,138,91,0.18)",
        padding: "20px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#1F8A5B", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          Publishing terms
        </Text>
        <Text style={{ margin: "0 0 8px", fontSize: 14, color: "#2A1A12", lineHeight: "1.6" }}>
          📖 &nbsp;<strong>Story:</strong> {storyTitle}
        </Text>
        <Text style={{ margin: "0 0 8px", fontSize: 14, color: "#2A1A12", lineHeight: "1.6" }}>
          🪙 &nbsp;<strong>Reader price:</strong> {cowrieCost} cowrie{cowrieCost !== 1 ? "s" : ""}
        </Text>
        <Text style={{ margin: 0, fontSize: 14, color: "#2A1A12", lineHeight: "1.6" }}>
          💰 &nbsp;<strong>Your cut:</strong> {writerSharePercent}% of every sale
        </Text>
      </Section>

      <Text style={styles.p}>
        A publishing contract is waiting for you in the app. Open Kekere Stories, check your
        notifications, and sign it with one tap. Your story goes live the moment you sign.
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Link href={contractUrl} style={styles.button("#1F8A5B")}>
          Review &amp; sign your contract →
        </Link>
      </Section>

      <Text style={{ ...styles.muted, marginBottom: 0 }}>
        This contract offer expires in {expiresInDays} days. After that you'll need to resubmit
        your story if you'd still like to publish with us.
      </Text>

    </BaseEmail>
  );
}
