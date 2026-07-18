/**
 * Pure Cloudinary CDN URL builders — no SDK import, unlike cloudinary.ts
 * (which pulls in the `cloudinary` package and transitively Node's `fs`).
 * Server-only in practice: every caller precomputes the URL server-side and
 * passes the finished string down as a prop, the same way coverImageUrl
 * already works in lib/adapters/kekere.ts — client components never call
 * these directly, which is what keeps the `cloudinary` package out of the
 * browser bundle.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";

/** Constructs the optimised Cloudinary CDN URL for a story cover.
 *  Auto format + quality, cropped to 3:4 portrait at 2× resolution. */
export function storyCoverUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_280,h_373,c_fill/${publicId}`;
}

/** Same cover image, cropped to the 1200×630 landscape shape social
 *  platforms expect for og:image/Twitter card previews — the 3:4 portrait
 *  crop above reads as a tiny sliver when embedded in a share card. */
export function storyCoverOgImageUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1200,h_630,c_fill/${publicId}`;
}

/** Constructs the optimised Cloudinary CDN URL for a user's avatar. */
export function userAvatarUrl(ref: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_200,h_200,c_fill/${ref}`;
}

/** Larger avatar, forced to PNG rather than f_auto — used by the
 *  server-rendered profile share card (src/app/api/kekere/writers/[id]/card),
 *  where satori/resvg's raster decoder needs a guaranteed-safe format
 *  instead of a browser-negotiated one. */
export function userAvatarCardUrl(ref: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_png,q_auto,w_400,h_400,c_fill/${ref}`;
}

/** Story cover for the same server-rendered profile share card — see
 *  userAvatarCardUrl above for why this forces PNG instead of f_auto. */
export function storyCoverCardUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_png,q_auto,w_320,h_420,c_fill/${publicId}`;
}
