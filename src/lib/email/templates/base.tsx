import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const colors = {
  bg: "#FDF8F3",
  card: "#FFFFFF",
  orange: "#C75D2C",
  brown: "#2A1A12",
  muted: "#8A7565",
  border: "rgba(42,26,18,0.10)",
};

interface BaseEmailProps {
  preview: string;
  children: ReactNode;
  brand?: "kekere" | "narriva";
  /** Only set on the opt-in retention emails (writer-published, note reply,
   *  streak reminder, weekly digest) — mandatory transactional mail (OTP,
   *  password reset, contracts) never passes this, so it never shows an
   *  unsubscribe link. */
  unsubscribeUrl?: string;
}

export function BaseEmail({ preview, children, brand = "kekere", unsubscribeUrl }: BaseEmailProps) {
  const accentColor = brand === "kekere" ? colors.orange : "#1E3A8A";
  const brandName = brand === "kekere" ? "Kekere Stories" : "Narriva";

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, padding: 0, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>

          {/* Logo strip */}
          <Section style={{ textAlign: "center", paddingBottom: 28 }}>
            <Text style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: colors.brown,
            }}>
              <span style={{ color: accentColor }}>●</span> {brandName}
            </Text>
          </Section>

          {/* Card */}
          <Section style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            padding: "36px 40px",
            boxShadow: "0 2px 12px rgba(42,26,18,0.06)",
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: "center", paddingTop: 28 }}>
            <Text style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: "1.6" }}>
              {brandName}{brand === "kekere" ? ", an imprint of Narriva Publishing" : ""}
              <br />
              You received this because you have an account with us.
              {unsubscribeUrl && (
                <>
                  {" "}
                  <Link href={unsubscribeUrl} style={{ color: colors.muted, textDecoration: "underline" }}>
                    Unsubscribe from these emails
                  </Link>
                  .
                </>
              )}
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export const styles = {
  h1: {
    margin: "0 0 8px",
    fontSize: 26,
    fontWeight: 700,
    lineHeight: "1.25",
    color: "#2A1A12",
    letterSpacing: "-0.3px",
  } as React.CSSProperties,

  h2: {
    margin: "0 0 6px",
    fontSize: 20,
    fontWeight: 700,
    color: "#2A1A12",
  } as React.CSSProperties,

  p: {
    margin: "0 0 16px",
    fontSize: 15,
    lineHeight: "1.65",
    color: "#4A3728",
    fontFamily: "Georgia, 'Times New Roman', serif",
  } as React.CSSProperties,

  muted: {
    margin: "0 0 16px",
    fontSize: 13,
    lineHeight: "1.6",
    color: "#8A7565",
  } as React.CSSProperties,

  divider: {
    borderTop: "1px solid rgba(42,26,18,0.10)",
    margin: "24px 0",
  } as React.CSSProperties,

  button: (bg = "#C75D2C") => ({
    display: "inline-block",
    backgroundColor: bg,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 700,
    padding: "14px 28px",
    borderRadius: 10,
    textDecoration: "none",
    letterSpacing: "0.01em",
  }) as React.CSSProperties,

  pill: (bg: string, color: string) => ({
    display: "inline-block",
    backgroundColor: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  }) as React.CSSProperties,
};
