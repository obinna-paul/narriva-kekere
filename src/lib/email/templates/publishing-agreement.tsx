import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface PublishingAgreementEmailProps {
  writerName: string;
  storyTitle: string;
  claimUrl: string;
}

export function PublishingAgreementEmail({
  writerName,
  storyTitle,
  claimUrl,
}: PublishingAgreementEmailProps) {
  return (
    <BaseEmail preview={`Your publishing agreement for "${storyTitle}" is ready`} brand="kekere">
      <Text style={styles.h1}>Your publishing agreement is ready</Text>

      <Text style={styles.p}>
        Hi {writerName}, congratulations — your story{" "}
        <strong>&ldquo;{storyTitle}&rdquo;</strong> has been accepted for
        publishing on Kekere Stories, an imprint of Narriva Publishing.
      </Text>

      <Text style={styles.p}>
        We&rsquo;ve attached the full publishing agreement as a PDF. Take your
        time reading it — the agreement covers your 70% writer earnings share,
        copyright ownership, and publishing terms.
      </Text>

      <Section style={{
        backgroundColor: "#FFF8F2",
        borderRadius: 12,
        border: "1px solid rgba(199,93,44,0.18)",
        padding: "18px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#C75D2C", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          Next step
        </Text>
        <Text style={{ margin: 0, fontSize: 14, color: "#2A1A12", lineHeight: "1.6" }}>
          When you&rsquo;re ready, click the button below to review and sign your
          agreement, set up your writer account, and go live. Your story will
          appear in the feed the moment you sign.
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Link href={claimUrl} style={styles.button()}>
          Review, sign &amp; go live →
        </Link>
      </Section>

      <Text style={styles.muted}>
        Welcome to Kekere Stories — we&rsquo;re excited to have you.
      </Text>
    </BaseEmail>
  );
}
