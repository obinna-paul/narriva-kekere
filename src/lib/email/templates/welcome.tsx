import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface WelcomeEmailProps {
  name: string;
  appUrl?: string;
}

export function WelcomeEmail({ name, appUrl = "https://kekere.narriva.pro/kekere" }: WelcomeEmailProps) {
  return (
    <BaseEmail preview={`A personal welcome from our CEO, Obinna Ezeodili — your first read is on us`}>

      <Text style={styles.h1}>Welcome to Kekere Stories</Text>
      <Text style={styles.p}>
        Hi {name}, I&apos;m Obinna, the CEO of Kekere Stories — and I wanted to welcome you myself,
        not through some automated blast. I&apos;m genuinely glad you&apos;re here.
      </Text>

      <Text style={styles.p}>
        Here&apos;s my promise to you: every single story on Kekere is worth your time. Our editors
        read far more submissions than we ever publish, and only the best make it through — the
        ones with a real voice, a sharp idea, an ending that lands. If a story is on your feed, it
        earned its place there.
      </Text>

      <Text style={styles.p}>
        We chose short fiction on purpose, not novels. Life in Lagos, in Nairobi, in London, wherever
        you&apos;re reading this from, doesn&apos;t leave much room for a 400-page commitment. But it
        always leaves room for one great story in the time it takes to wait for a bus, finish a
        meal, or fall asleep. Small doesn&apos;t mean small stakes — some of the best storytelling
        we&apos;ve ever read has happened in a few thousand words.
      </Text>

      <Text style={styles.p}>
        Every story is priced in cowries, our in-app currency — and this is the part I care about
        most. 70% of every cowrie spent on a story goes directly to the writer who wrote it. Kekere
        exists to make sure African writers can actually earn from short fiction, not just get
        exposure. When you unlock a story, you&apos;re paying a writer, directly.
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
          Pick any story on Kekere, open it, and read it — no cowries needed. See what we mean
          before you ever top up.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Link href={appUrl} style={styles.button()}>
          Start reading →
        </Link>
      </Section>

      <Text style={{ ...styles.p, marginBottom: 4 }}>
        Thank you for giving us a chance.
      </Text>
      <Text style={{ ...styles.p, marginBottom: 24 }}>
        — Obinna Ezeodili<br />
        <span style={{ fontSize: 13, color: "#8A7565" }}>CEO, Kekere Stories</span>
      </Text>

      <Text style={styles.muted}>
        Questions? Just reply to this email. I actually read them.
      </Text>

    </BaseEmail>
  );
}
