import { Hr, Section, Text } from "@react-email/components";
import { styles } from "./base";

export interface SignatureProps {
  name: string;
  role: string;
  /** The brand line (e.g. "Kekere Stories"). Rendered in the accent colour. */
  brand: string;
  /** Accent colour for the brand line — defaults to Kekere orange. */
  brandColor?: string;
}

/**
 * A styled personal signature block — subtle divider, name, role, and brand.
 * Designed to sit inside the card (above the BaseEmail corporate footer) so
 * system notifications can close with a real human name rather than just a
 * boilerplate footer.

 * Place it as the last element before the card closes. If the container
 * already has enough bottom padding the last Text won't overflow; the
 * parent card provides padding-bottom: 40px.
 */
export function SignatureBlock({ name, role, brand, brandColor = "#C75D2C" }: SignatureProps) {
  return (
    <Section style={{ marginTop: 4 }}>
      <Hr style={styles.divider} />
      <Text style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2A1A12", lineHeight: "1.5" }}>
        {name},
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: "#8A7565", lineHeight: "1.55" }}>
        {role}
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: brandColor, lineHeight: "1.55" }}>
        {brand}
      </Text>
    </Section>
  );
}
