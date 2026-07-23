import { Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";
import { SignatureBlock } from "./signature";

interface ContractDeclinedEmailProps {
  writerName: string;
  storyTitle?: string;
  submissionsEmail: string;
}

export function ContractDeclinedEmail({ writerName, storyTitle, submissionsEmail }: ContractDeclinedEmailProps) {
  const storyLabelPlain = storyTitle ? `"${storyTitle}"` : "your story";
  const storyLabel = storyTitle ? <strong>&ldquo;{storyTitle}&rdquo;</strong> : <strong>your story</strong>;

  return (
    <BaseEmail preview={`Sorry to see ${storyLabelPlain} go`}>

      <Text style={styles.h1}>We understand — the door stays open</Text>

      <Text style={styles.p}>
        Hi {writerName}, ah — we were quietly hoping you&rsquo;d say yes. You&rsquo;ve declined the
        publishing agreement for {storyLabel}, and that&rsquo;s completely your call. Your
        story, your rights, always.
      </Text>

      <Text style={styles.p}>
        We&rsquo;ll be honest: we&rsquo;re a little sad about it. We don&rsquo;t send an agreement
        for a story we aren&rsquo;t genuinely excited about, so {storyLabel} slipping away stings
        just a bit on our end.
      </Text>

      <Text style={styles.p}>
        But there&rsquo;s zero pressure here. If you tapped decline by mistake, if you&rsquo;d like
        to talk anything through, or if you simply change your mind next week, next month, or next
        year — we&rsquo;re one email away at {submissionsEmail}. The door stays wide open.
      </Text>

      <Text style={styles.p}>
        And if this is where we part ways for now: thank you for trusting us with your work long
        enough to consider it. Please keep writing. Stories like yours are exactly why Kekere
        exists.
      </Text>

      <SignatureBlock name="Kemi" role="Editorial Team" brand="Kekere Stories" />

    </BaseEmail>
  );
}
