// One-off script: derives Kekere's PWA icon set from the existing high-res
// logo. Run with `node scripts/generate-pwa-icons.mjs` whenever the source
// logo changes — output is committed to public/kekere/icons/, not
// regenerated at build time.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public", "kekere-logo.png");
const outDir = path.join(root, "public", "kekere", "icons");

const BG = "#F5EBDD"; // Kekere --color-bg

// The source PNG is a 4000x4000 canvas with the actual mark sitting in the
// middle of a huge transparent margin (it only fills ~65% of the canvas
// width) — resizing the raw file shrinks the visible logo down further
// inside that baked-in padding, so every generated icon came out tiny and
// washed-out instead of filling the frame the way the source art actually
// looks. Trim to the real content bounds once, up front, and derive every
// icon from that.
async function trimmedSource() {
  return sharp(source).trim().toBuffer();
}

async function regularIcon(logo, size, filename) {
  // "any"-purpose icons are placed as-is with no OS-applied mask, so they
  // should fill most of the canvas like a typical home-screen icon.
  const resized = await sharp(logo).resize(Math.round(size * 0.86), Math.round(size * 0.86), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function maskableIcon(logo, size, filename) {
  // Maskable icons need the logo within a safe zone since OS icon masks
  // (circle/squircle) can crop the outer edge — per the W3C/Google maskable
  // icon spec, content should fit within a centered safe zone that's ~80% of
  // the icon's diameter to survive any mask shape without clipping.
  const resized = await sharp(logo).resize(Math.round(size * 0.8), Math.round(size * 0.8), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function appleTouchIcon(logo) {
  // iOS applies its own rounded-corner mask (no clipping of a circular safe
  // zone the way maskable icons need), so this can fill nearly the full
  // canvas — iOS ignores/mishandles alpha on home-screen icons, so flatten
  // fully opaque.
  const resized = await sharp(logo).resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: 180, height: 180, channels: 3, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(outDir, "..", "apple-touch-icon.png"));
}

async function main() {
  const logo = await trimmedSource();
  await regularIcon(logo, 192, "icon-192.png");
  await regularIcon(logo, 512, "icon-512.png");
  await maskableIcon(logo, 192, "icon-maskable-192.png");
  await maskableIcon(logo, 512, "icon-maskable-512.png");
  await appleTouchIcon(logo);
  console.log("Generated Kekere PWA icons in", outDir, "and public/kekere/apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
