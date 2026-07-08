import { Section, Text } from "@react-email/components";
import { BaseEmail, styles } from "./base";

export interface WalletHistoryRow {
  date: string;
  label: string;
  amountCowries: number;
  isDebit: boolean;
}

interface WalletHistoryEmailProps {
  name: string;
  from: string;
  to: string;
  rows: WalletHistoryRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function WalletHistoryEmail({ name, from, to, rows }: WalletHistoryEmailProps) {
  const fromLabel = formatDate(from);
  const toLabel = formatDate(to);

  return (
    <BaseEmail preview={`Your Kekere transaction history: ${fromLabel} – ${toLabel}`}>
      <Text style={styles.h1}>Your transaction history</Text>

      <Text style={styles.p}>
        Hi {name}, here&apos;s everything on your Kekere wallet between {fromLabel} and {toLabel}, as you requested.
      </Text>

      <Section style={{ marginTop: 8, marginBottom: 8 }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(42,26,18,0.14)", color: "#8A7565", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                Date
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(42,26,18,0.14)", color: "#8A7565", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                Description
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(42,26,18,0.14)", color: "#8A7565", fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>
                Amount
              </td>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(42,26,18,0.06)", color: "#4A3728" }}>
                  {new Date(r.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" })}
                </td>
                <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(42,26,18,0.06)", color: "#4A3728" }}>
                  {r.label}
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(42,26,18,0.06)",
                    textAlign: "right",
                    fontWeight: 700,
                    color: r.isDebit ? "#C0392B" : "#1F8A5B",
                  }}
                >
                  {r.isDebit ? "-" : "+"}
                  {r.amountCowries}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Text style={styles.muted}>
        {rows.length} transaction{rows.length === 1 ? "" : "s"} in this period.
      </Text>
    </BaseEmail>
  );
}
