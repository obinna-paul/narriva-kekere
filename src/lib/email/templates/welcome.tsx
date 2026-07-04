import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface WelcomeEmailProps {
  name: string;
  appUrl?: string;
}

export function WelcomeEmail({ name, appUrl = "https://kekere.narriva.pro/kekere" }: WelcomeEmailProps) {
  return (
    <BaseEmail preview={`Welcome to Kekere Stories, ${name} — your first read is on us`}>

      <Text style={styles.h1}>Welcome to Kekere Stories</Text>
      <Text style={{ ...styles.p, marginBottom: 20 }}>
        Hi {name}, your account is verified and you're in. We're glad you're here.
      </Text>

      {/* First read free callout */}
      <Section style={{
        backgroundColor: "#FFF7F2",
        borderRadius: 12,
        border: "1px solid rgba(199,93,44,0.18)",
        padding: "20px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#C75D2C", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          Your welcome gift
        </Text>
        <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#2A1A12", lineHeight: "1.3" }}>
          Your first read is completely free.
        </Text>
        <Text style={{ margin: "8px 0 0", fontSize: 14, color: "#4A3728", lineHeight: "1.6" }}>
          Pick any story on Kekere, open it, and read it — no cowries needed for your first one.
        </Text>
      </Section>

      <Text style={styles.p}>
        Kekere Stories is a place for short African fiction. Every story is written by a real writer,
        reviewed by our editors, and priced in cowries — our in-app currency. Most stories cost 1–5 cowries to unlock.
      </Text>

      <Text style={{ ...styles.p, marginBottom: 28 }}>
        When you're ready, head to your feed and find something that catches your eye.
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Link href={appUrl} style={styles.button()}>
          Start reading →
        </Link>
      </Section>

      <Text style={styles.muted}>
        Questions? Just reply to this email. We actually read them.
      </Text>

    </BaseEmail>
  );
}
