import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface NoticeEmailProps {
  preview: string;
  heading: string;
  /** Paragraphs rendered in order, each as its own line. */
  lines: string[];
  /** Optional highlighted info card — an amount, a reason, a reference. */
  highlight?: { label: string; rows: string[]; tone?: "neutral" | "positive" };
  cta?: { label: string; url: string };
}

/**
 * Shared building block for the smaller transactional Kekere emails
 * (referral rewards, withdrawals, contract reminders, etc.) that don't
 * warrant a fully bespoke template — same visual language as the bespoke
 * ones (BaseEmail card, styles.h1/p, the tinted info-box convention from
 * story-accepted.tsx / story-rejected.tsx), just parameterized.
 */
export function NoticeEmail({ preview, heading, lines, highlight, cta }: NoticeEmailProps) {
  const positive = highlight?.tone === "positive";
  const boxBg = positive ? "#F6FBF8" : "#FDF8F3";
  const boxBorder = positive ? "rgba(31,138,91,0.18)" : "rgba(42,26,18,0.12)";
  const labelColor = positive ? "#1F8A5B" : "#8A7565";
  const accent = positive ? "#1F8A5B" : "#C75D2C";

  return (
    <BaseEmail preview={preview}>
      <Text style={styles.h1}>{heading}</Text>

      {lines.map((line, i) => (
        <Text key={i} style={styles.p}>
          {line}
        </Text>
      ))}

      {highlight && (
        <Section
          style={{
            backgroundColor: boxBg,
            borderRadius: 12,
            border: `1px solid ${boxBorder}`,
            padding: "18px 22px",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              fontWeight: 700,
              color: labelColor,
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
            }}
          >
            {highlight.label}
          </Text>
          {highlight.rows.map((row, i) => (
            <Text
              key={i}
              style={{
                margin: i === highlight.rows.length - 1 ? 0 : "0 0 6px",
                fontSize: 15,
                color: "#2A1A12",
                lineHeight: "1.6",
              }}
            >
              {row}
            </Text>
          ))}
        </Section>
      )}

      {cta && (
        <Section style={{ textAlign: "center", marginBottom: 0 }}>
          <Link href={cta.url} style={styles.button(accent)}>
            {cta.label}
          </Link>
        </Section>
      )}
    </BaseEmail>
  );
}
