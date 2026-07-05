import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

interface FirstTopUpEmailProps {
  name: string;
  appUrl?: string;
}

export function FirstTopUpEmail({ name, appUrl = "https://kekere.narriva.pro/kekere/feed" }: FirstTopUpEmailProps) {
  return (
    <BaseEmail preview="A personal thank-you from our CEO, Obinna Ezeodili">

      <Text style={styles.h1}>Thank you for topping up</Text>

      <Text style={styles.p}>
        Hi {name}, Obinna here again — CEO of Kekere Stories. I saw you just topped up your
        cowries for the first time, and I wanted to say thank you, personally.
      </Text>

      <Text style={styles.p}>
        Every cowrie you spend goes straight toward keeping African writers paid for their work.
        That commitment, from someone I&apos;ve never met, means more to me than you probably
        realize. It&apos;s the whole reason Kekere exists.
      </Text>

      <Text style={styles.p}>
        I hope you have a beautiful time on the app, reading amazing short stories from African
        writers. There&apos;s a lot more waiting for you.
      </Text>

      <Section style={{ textAlign: "center", marginBottom: 28 }}>
        <Link href={appUrl} style={styles.button()}>
          Keep reading →
        </Link>
      </Section>

      <Text style={{ ...styles.p, marginBottom: 4 }}>
        With gratitude,
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
