export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import {
  getPublicWriterProfile,
  getWriterProfileStats,
  getWriterPublishedStories,
} from "@/lib/data/kekere-writer-profile";
import { userAvatarCardUrl, storyCoverCardUrl } from "@/lib/storage/cloudinary-urls";
import { loadGoogleFont } from "@/lib/og/google-font";
import { SITE_URL } from "@/content/decisions";

// Not `edge` — this route reads the logo PNG off disk (fs), which edge
// runtime can't do.

const WIDTH = 1080;
const HEIGHT = 1350;

// A deliberately different, richer register than the app's everyday warm
// cream UI — this card is meant to read as a keepsake/membership object
// worth sharing, not another screenshot of the app.
const INK = "#150D08";
const CREAM = "#F7EFE3";
const GOLD = "#E9C9A3";
const GOLD_DIM = "rgba(233,201,163,0.28)";
const GOLD_MUTED = "rgba(233,201,163,0.7)";
const WARM_GRAY = "rgba(247,239,227,0.78)";

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function formatMemberSince(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = await getPublicWriterProfile(params.id);
  if (result.kind !== "writer") {
    return new Response("Not found", { status: 404 });
  }
  const { profile } = result;

  const [stats, stories, logoBuffer] = await Promise.all([
    getWriterProfileStats(params.id),
    getWriterPublishedStories(params.id),
    readFile(path.join(process.cwd(), "public", "kekere-logo.png")),
  ]);

  const topStory = stories.find((s) => s.mostPopular) ?? stories[0] ?? null;
  const logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const name = truncate(profile.name || "A Kekere writer", 42);
  const bio = profile.bio ? truncate(profile.bio, 150) : null;
  const storyTitle = topStory ? truncate(topStory.title, 56) : null;
  const storyHook = topStory ? truncate(topStory.hookLine, 90) : null;
  const memberSince = formatMemberSince(profile.memberSince);
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  const avatarColor = profile.avatarColor ?? "#C75D2C";

  const cardText = [
    "KEKERE STORIES",
    "WRITER",
    name,
    bio,
    profile.country ? `Writer from ${profile.country}` : "",
    storyTitle,
    storyHook,
    "TOP STORY",
    "FEATURED STORY",
    `${stats.publishedCount} ${stats.publishedCount === 1 ? "story" : "stories"}`,
    `Since ${memberSince}`,
    "Kekere Stories",
    `Read my stories at ${SITE_URL.replace("https://", "")}/kekere`,
  ]
    .filter(Boolean)
    .join(" ");

  const [frauncesBold, interRegular, interSemibold] = await Promise.all([
    loadGoogleFont("Fraunces", 700, cardText),
    loadGoogleFont("Inter", 400, cardText),
    loadGoogleFont("Inter", 600, cardText),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }[] = [];
  if (frauncesBold) fonts.push({ name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" });
  if (interRegular) fonts.push({ name: "Inter", data: interRegular, weight: 400, style: "normal" });
  if (interSemibold) fonts.push({ name: "Inter", data: interSemibold, weight: 600, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(circle at 50% 8%, rgba(199,93,44,0.28) 0%, rgba(21,13,8,0) 55%)`,
          fontFamily: "Inter",
          overflow: "hidden",
        }}
      >
        {/* Watermark — oversized and bled off every edge so it reads as a
            soft texture rather than a recognizable icon with hard edges,
            which is what actually made a small centered mark look like a
            visible dark block instead of a subtle authenticity mark. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={logoDataUri}
          width={1600}
          height={1600}
          style={{ position: "absolute", top: -125, left: -260, opacity: 0.035, display: "flex" }}
        />

        {/* Inset frame, like a membership card border */}
        <div
          style={{
            position: "absolute",
            top: 42,
            left: 42,
            right: 42,
            bottom: 42,
            border: `1px solid ${GOLD_DIM}`,
            borderRadius: 28,
            display: "flex",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            height: "100%",
            padding: "78px 88px",
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="" src={logoDataUri} width={32} height={32} style={{ display: "flex", marginRight: 12 }} />
              <span
                style={{
                  display: "flex",
                  fontSize: 15,
                  letterSpacing: 4,
                  color: GOLD,
                  fontWeight: 600,
                }}
              >
                KEKERE STORIES
              </span>
            </div>
            <div
              style={{
                display: "flex",
                border: `1px solid ${GOLD_DIM}`,
                borderRadius: 20,
                padding: "7px 18px",
              }}
            >
              <span style={{ display: "flex", fontSize: 13, letterSpacing: 3, color: GOLD_MUTED }}>WRITER</span>
            </div>
          </div>

          <div style={{ display: "flex", width: 60, height: 2, backgroundColor: GOLD, marginTop: 40, marginBottom: 38 }} />

          {/* Avatar */}
          <div
            style={{
              display: "flex",
              width: 176,
              height: 176,
              borderRadius: 88,
              border: `3px solid ${GOLD}`,
              padding: 6,
              marginBottom: 30,
            }}
          >
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                src={userAvatarCardUrl(profile.avatar)}
                width={164}
                height={164}
                style={{ display: "flex", borderRadius: 82, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 164,
                  height: 164,
                  borderRadius: 82,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: `linear-gradient(135deg, #E08A4A, ${avatarColor})`,
                  fontSize: 60,
                  fontFamily: "Fraunces",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {initial}
              </div>
            )}
          </div>

          {/* Name */}
          <div
            style={{
              display: "flex",
              fontSize: 50,
              fontFamily: "Fraunces",
              fontWeight: 700,
              color: CREAM,
              textAlign: "center",
              maxWidth: 820,
            }}
          >
            {name}
          </div>

          {profile.country && (
            <div style={{ display: "flex", marginTop: 12, fontSize: 19, color: GOLD_MUTED }}>
              Writer from {profile.country}
            </div>
          )}

          {bio && (
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 22,
                lineHeight: 1.55,
                color: WARM_GRAY,
                textAlign: "center",
                maxWidth: 760,
              }}
            >
              {bio}
            </div>
          )}

          <div style={{ display: "flex", flexGrow: 1 }} />

          {/* Top story */}
          {topStory && storyTitle && (
            <div
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                border: `1px solid ${GOLD_DIM}`,
                borderRadius: 20,
                padding: 24,
                backgroundColor: "rgba(233,201,163,0.05)",
              }}
            >
              {topStory.coverImageRef && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  src={storyCoverCardUrl(topStory.coverImageRef)}
                  width={82}
                  height={108}
                  style={{ display: "flex", borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: topStory.coverImageRef ? 22 : 0,
                }}
              >
                <span style={{ display: "flex", fontSize: 12, letterSpacing: 3, color: GOLD, marginBottom: 8 }}>
                  {topStory.mostPopular ? "TOP STORY" : "FEATURED STORY"}
                </span>
                <span
                  style={{
                    display: "flex",
                    fontSize: 27,
                    fontFamily: "Fraunces",
                    fontWeight: 700,
                    color: CREAM,
                    lineHeight: 1.2,
                  }}
                >
                  {storyTitle}
                </span>
                {storyHook && (
                  <span style={{ display: "flex", marginTop: 8, fontSize: 16, fontStyle: "italic", color: WARM_GRAY }}>
                    {storyHook}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
            <span style={{ display: "flex", fontSize: 16, color: GOLD_MUTED }}>
              {stats.publishedCount} {stats.publishedCount === 1 ? "story" : "stories"}
            </span>
            <div style={{ display: "flex", width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD_DIM, margin: "0 14px" }} />
            <span style={{ display: "flex", fontSize: 16, color: GOLD_MUTED }}>Since {memberSince}</span>
          </div>

          <div style={{ display: "flex", width: 60, height: 2, backgroundColor: GOLD, marginTop: 28, marginBottom: 18 }} />

          <div style={{ display: "flex", fontSize: 22, fontFamily: "Fraunces", fontWeight: 700, color: GOLD }}>
            Kekere Stories
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 14, letterSpacing: 1, color: WARM_GRAY }}>
            Read my stories at {SITE_URL.replace("https://", "")}/kekere
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );
}
