import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

export interface DigestItem {
  emoji: string;
  title: string;
  detail: string;
  url: string;
}

interface WeeklyDigestEmailProps {
  name: string;
  items: DigestItem[];
  feedUrl: string;
  unsubscribeUrl: string;
}

/**
 * Bespoke rather than built on NoticeEmail — a digest is a list of
 * unrelated items (new story, note reply, recommendation), not a single
 * paragraph-plus-highlight notice, so it needs its own repeating-card
 * layout instead of NoticeEmail's flat lines[]/highlight shape.
 */
export function WeeklyDigestEmail({ name, items, feedUrl, unsubscribeUrl }: WeeklyDigestEmailProps) {
  return (
    <BaseEmail preview={`Your week on Kekere Stories, ${name}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ ...styles.h1, marginBottom: 4 }}>Your week on Kekere</Text>
      <Text style={{ ...styles.muted, marginBottom: 20 }}>A few things worth catching up on, {name}</Text>

      {items.map((item, i) => (
        <Section
          key={i}
          style={{
            backgroundColor: "#FDF8F3",
            borderRadius: 12,
            border: "1px solid rgba(42,26,18,0.10)",
            padding: "16px 20px",
            marginBottom: i === items.length - 1 ? 24 : 12,
          }}
        >
          <Text style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#2A1A12" }}>
            {item.emoji} &nbsp;{item.title}
          </Text>
          <Text style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: "1.55", color: "#6B5744" }}>
            {item.detail}
          </Text>
          <Link href={item.url} style={{ fontSize: 13, fontWeight: 700, color: "#C75D2C", textDecoration: "none" }}>
            Open →
          </Link>
        </Section>
      ))}

      <Section style={{ textAlign: "center", marginBottom: 0 }}>
        <Link href={feedUrl} style={styles.button()}>
          See what&apos;s new
        </Link>
      </Section>
    </BaseEmail>
  );
}
