import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const BRANDS = {
  narriva: {
    name: "Narriva",
    bg: "#FAF8F4",
    ink: "#161616",
    accent: "#B08D57",
  },
  kekere: {
    name: "Kekere Stories",
    bg: "#F5EBDD",
    ink: "#2A1A12",
    accent: "#C75D2C",
  },
} as const;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandKey = searchParams.get("brand") === "kekere" ? "kekere" : "narriva";
  const brand = BRANDS[brandKey];
  const title = truncate(searchParams.get("title") ?? brand.name, 90);
  const subtitle = searchParams.get("subtitle");
  const bg = searchParams.get("color") || brand.bg;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: bg,
          color: brand.ink,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontStyle: "italic",
            color: brand.accent,
          }}
        >
          {brand.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: 64, height: 3, backgroundColor: brand.accent, marginBottom: 28 }} />
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 600,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: brand.accent }}>
              {truncate(subtitle, 80)}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
