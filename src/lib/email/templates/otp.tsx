import { Hr, Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface OtpEmailProps {
  name: string;
  otp: string;
  expiryMinutes?: number;
}

export function OtpEmail({ name, otp, expiryMinutes = 10 }: OtpEmailProps) {
  return (
    <BaseEmail preview={`${otp} is your Kekere Stories verification code`}>

      <Text style={styles.h1}>Verify your email</Text>
      <Text style={styles.p}>Hi {name}, welcome to Kekere Stories.</Text>
      <Text style={{ ...styles.p, marginBottom: 24 }}>
        Enter this code to confirm your email address and activate your account:
      </Text>

      {/* OTP block */}
      <Section style={{
        backgroundColor: "#FDF8F3",
        borderRadius: 12,
        border: "1px solid rgba(199,93,44,0.20)",
        padding: "20px 0",
        textAlign: "center",
        marginBottom: 24,
      }}>
        <Text style={{
          margin: 0,
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: "12px",
          color: "#C75D2C",
          fontFamily: "'Courier New', Courier, monospace",
        }}>
          {otp}
        </Text>
      </Section>

      <Text style={styles.muted}>
        This code expires in {expiryMinutes} minutes. If you didn't create a Kekere Stories account, you can safely ignore this email.
      </Text>

    </BaseEmail>
  );
}
