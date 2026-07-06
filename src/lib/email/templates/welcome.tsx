import { Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <BaseEmail preview={`A personal welcome from Obinna, co-founder and CEO of Kekere Stories`}>

      <Text style={styles.h1}>Welcome to Kekere Stories</Text>

      <Text style={styles.p}>
        Hi {name},
      </Text>

      <Text style={styles.p}>
        I&apos;m Obinna, co-founder and CEO of Kekere Stories. I&apos;m genuinely glad you&apos;re
        here, and I can&apos;t wait for you to read all the short stories we&apos;ve curated for you!
      </Text>

      <Text style={styles.p}>
        You see, we chose short fiction on purpose, not novels. Life in Lagos, in Nairobi, in
        London, wherever you&apos;re reading this from, doesn&apos;t leave much room for a 400-page
        commitment. But it always leaves room for one great story in the time it takes to wait for
        a bus, finish a meal, or fall asleep. Small doesn&apos;t mean small stakes. Some of the best
        storytelling we&apos;ve ever read has happened in a few thousand words.
      </Text>

      <Text style={styles.p}>
        I wonder which of our stories you&apos;ll read first 🙃
      </Text>

      <Text style={{ ...styles.p, marginBottom: 0 }}>
        Cheers,<br />
        Obinna
      </Text>

    </BaseEmail>
  );
}
