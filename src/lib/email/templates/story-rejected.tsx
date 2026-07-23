import { Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";
import { SignatureBlock } from "./signature";

interface StoryRejectedEmailProps {
  writerName: string;
  storyTitle: string;
  editorFeedback: string;
}

export function StoryRejectedEmail({ writerName, storyTitle, editorFeedback }: StoryRejectedEmailProps) {
  return (
    <BaseEmail preview={`Editor feedback on your story "${storyTitle}"`}>

      <Text style={styles.h1}>About your submission</Text>

      <Text style={styles.p}>
        Hi {writerName}, thank you for submitting <strong>&ldquo;{storyTitle}&rdquo;</strong> to Kekere Stories.
        Our editors have reviewed it and it&rsquo;s not the right fit for us at this time.
      </Text>

      {/* Editor feedback */}
      <Section style={{
        backgroundColor: "#FDF8F3",
        borderRadius: 12,
        border: "1px solid rgba(42,26,18,0.12)",
        padding: "20px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#8A7565", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
          Editor&rsquo;s note
        </Text>
        <Text style={{ margin: 0, fontSize: 15, color: "#2A1A12", lineHeight: "1.7", fontStyle: "italic" }}>
          {editorFeedback}
        </Text>
      </Section>

      <Text style={styles.p}>
        This doesn&rsquo;t mean the story can&rsquo;t be great — editorial judgment is subjective, and what
        doesn&rsquo;t fit Kekere today may be exactly right somewhere else, or at a different stage of revision.
      </Text>

      <Text style={styles.p}>
        We hope to see more of your writing. Keep going.
      </Text>

      <SignatureBlock name="Kemi" role="Editorial Team" brand="Kekere Stories" />

    </BaseEmail>
  );
}
