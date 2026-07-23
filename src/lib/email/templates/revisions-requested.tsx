import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";
import { SignatureBlock } from "./signature";

interface RevisionsRequestedEmailProps {
  writerName: string;
  storyTitle: string;
  editorNotes: string;
  storyId: string;
  editorUrl?: string;
}

export function RevisionsRequestedEmail({
  writerName,
  storyTitle,
  editorNotes,
  storyId,
  editorUrl,
}: RevisionsRequestedEmailProps) {
  const url = editorUrl ?? `https://narriva.pro/kekere/write?id=${storyId}`;

  return (
    <BaseEmail preview={`Revisions requested for "${storyTitle}" — editor's notes inside`}>

      <Text style={styles.h1}>Your story needs a few changes</Text>

      <Text style={styles.p}>
        Hi {writerName}, an editor has reviewed <strong>&ldquo;{storyTitle}&rdquo;</strong> and has some
        feedback before it can be published. This is a normal part of the process — it means
        we&rsquo;re interested.
      </Text>

      {/* Editor notes */}
      <Section style={{
        backgroundColor: "#FFFBF2",
        borderRadius: 12,
        border: "1px solid rgba(183,121,31,0.22)",
        padding: "20px 24px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#B7791F", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
          What needs to change
        </Text>
        <Text style={{ margin: 0, fontSize: 15, color: "#2A1A12", lineHeight: "1.7" }}>
          {editorNotes}
        </Text>
      </Section>

      <Text style={{ ...styles.p, marginBottom: 24 }}>
        Open your story in the Kekere editor, make the changes, and resubmit when you&rsquo;re ready.
      </Text>

      <Section style={{ textAlign: "center", marginBottom: 24 }}>
        <Link href={url} style={styles.button("#B7791F")}>
          Open story in editor →
        </Link>
      </Section>

      <Text style={styles.muted}>
        Take your time — there&rsquo;s no deadline on revisions. We&rsquo;ll review it again as soon as
        you resubmit.
      </Text>

      <SignatureBlock name="Kemi" role="Editorial Team" brand="Kekere Stories" />

    </BaseEmail>
  );
}
