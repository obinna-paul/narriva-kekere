// One-off script: derives Kekere's PWA icon set (home-screen / app icons
// only) from the existing high-res logo (public/kekere-logo.png — the same
// wordmark used elsewhere across the site, e.g. the nav header, untouched
// by this script). Run with `node scripts/generate-pwa-icons.mjs` whenever
// the source logo changes — output is committed to public/kekere/icons/,
// not regenerated at build time.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public", "kekere-logo.png");
const outDir = path.join(root, "public", "kekere", "icons");

const BG = "#C75D2C"; // Kekere --color-primary — solid fill, Wattpad-icon style

// The source art is a "K" drawn as negative space: a solid white fill
// occupies the whole tile, and an orange border + a handful of orange
// facet cuts carve the letterform's silhouette out of it — the white
// regions ARE the K, not a separate glyph layered on a background. That
// means the old approach (place the source logo's own square, border and
// all, onto a colored canvas) can't just get a new background color
// dropped behind it — the orange border and facets are baked into the same
// flat image as the letterform, so recoloring the canvas around it doesn't
// touch them.
//
// Isolate the K instead: keep only the white pixels (using each pixel's
// darkest channel as a smooth 0..1 "whiteness" so the original facet-edge
// antialiasing survives instead of producing a jagged cutout), make
// everything else — border, facets, margin — transparent, then trim to the
// letterform's real bounds. What's left is the actual brand mark as a
// standalone cutout, ready to sit on a fresh solid-color background with
// real padding around it instead of the border square it used to live in.
async function extractedKMark() {
  const { data, info } = await sharp(source).trim().raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const whiteness = Math.max(0, Math.min(1, (Math.min(r, g, b) - 180) / (250 - 180)));
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round(whiteness * a);
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();
}

async function regularIcon(mark, size, filename) {
  // "any"-purpose icons are placed as-is with no OS-applied mask. 0.58
  // reads as a bold, confident glyph with real breathing room around it —
  // the whole point of this redesign was the old icon's border square
  // crowding the edges.
  const resized = await sharp(mark).resize(Math.round(size * 0.58), Math.round(size * 0.58), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function maskableIcon(mark, size, filename) {
  // Maskable icons need the glyph within a safe zone since OS icon masks
  // (circle/squircle) can crop the outer edge — per the W3C/Google maskable
  // icon spec, content should fit within a centered safe zone that's ~80% of
  // the icon's diameter to survive any mask shape without clipping. Scaled
  // down a bit further from the regular icon's 0.58 to stay clear of that
  // circle with margin to spare.
  const resized = await sharp(mark).resize(Math.round(size * 0.5), Math.round(size * 0.5), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function appleTouchIcon(mark) {
  // iOS applies its own rounded-corner mask (no circular safe-zone clipping
  // the way maskable icons need), so this matches the regular icon's 0.58
  // fill for visual consistency across every home-screen touchpoint. iOS
  // ignores/mishandles alpha on home-screen icons, so flatten fully opaque.
  const size = 180;
  const resized = await sharp(mark).resize(Math.round(size * 0.58), Math.round(size * 0.58), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(outDir, "..", "apple-touch-icon.png"));
}

async function main() {
  const mark = await extractedKMark();
  await regularIcon(mark, 192, "icon-192.png");
  await regularIcon(mark, 512, "icon-512.png");
  await maskableIcon(mark, 192, "icon-maskable-192.png");
  await maskableIcon(mark, 512, "icon-maskable-512.png");
  await appleTouchIcon(mark);
  console.log("Generated Kekere PWA icons in", outDir, "and public/kekere/apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
