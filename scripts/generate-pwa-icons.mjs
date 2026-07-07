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

async function regularIcon(size, filename) {
  const logo = await sharp(source).resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: "contain" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function maskableIcon(size, filename) {
  // Maskable icons need the logo within a smaller "safe zone" (~70% of the
  // canvas) since OS icon masks (circle/squircle) can crop the outer edge.
  const logo = await sharp(source).resize(Math.round(size * 0.55), Math.round(size * 0.55), { fit: "contain" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function appleTouchIcon() {
  // iOS ignores/mishandles alpha on home-screen icons — flatten fully opaque.
  const logo = await sharp(source).resize(130, 130, { fit: "contain" }).toBuffer();
  await sharp({ create: { width: 180, height: 180, channels: 3, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(outDir, "..", "apple-touch-icon.png"));
}

async function main() {
  await regularIcon(192, "icon-192.png");
  await regularIcon(512, "icon-512.png");
  await maskableIcon(192, "icon-maskable-192.png");
  await maskableIcon(512, "icon-maskable-512.png");
  await appleTouchIcon();
  console.log("Generated Kekere PWA icons in", outDir, "and public/kekere/apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
