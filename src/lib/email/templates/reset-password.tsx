import { Button, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
  expiryMinutes?: number;
}

export function ResetPasswordEmail({ name, resetUrl, expiryMinutes = 60 }: ResetPasswordEmailProps) {
  return (
    <BaseEmail preview="Reset your Kekere Stories password">

      <Text style={styles.h1}>Reset your password</Text>
      <Text style={styles.p}>Hi {name},</Text>
      <Text style={{ ...styles.p, marginBottom: 28 }}>
        We received a request to reset your Kekere Stories password. Click the button below to choose a new one.
      </Text>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Button href={resetUrl} style={styles.button("#C75D2C")}>
          Reset my password →
        </Button>
      </Section>

      <Text style={{ ...styles.muted, marginBottom: 0 }}>
        This link expires in {expiryMinutes} minutes. If you didn&apos;t request a password reset, you can safely ignore this email — your password will not change.
      </Text>

    </BaseEmail>
  );
}
