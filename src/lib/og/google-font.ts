// next/og's ImageResponse (satori under the hood) needs raw font bytes, not
// a next/font/google CSS variable — there's no built-in way to get those.
// Google Fonts serves modern WOFF2 to normal browsers, which satori can't
// reliably decode; sending a legacy user-agent string makes it fall back to
// serving plain WOFF/TTF instead, which satori handles fine. This is the
// standard workaround for using Google Fonts inside ImageResponse.
const LEGACY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.11 Safari/535.19";

const fontCache = new Map<string, ArrayBuffer | null>();

/** Fetches a single weight of a Google Font, subsetted to only the
 * characters actually needed (via Google Fonts' own `text=` param) — keeps
 * the fetch small and fast. Returns null on any failure so callers can fall
 * back to a system font rather than failing the whole image render. */
export async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const uniqueChars = Array.from(new Set(text.split(""))).join("");
  const cacheKey = `${family}:${weight}:${uniqueChars}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey) ?? null;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
    const cssRes = await fetch(cssUrl, { headers: { "User-Agent": LEGACY_USER_AGENT } });
    if (!cssRes.ok) throw new Error(`Google Fonts CSS request failed: ${cssRes.status}`);

    const css = await cssRes.text();
    const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
    if (!fontUrl) throw new Error("No font URL found in Google Fonts CSS response");

    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) throw new Error(`Font file request failed: ${fontRes.status}`);

    const buffer = await fontRes.arrayBuffer();
    fontCache.set(cacheKey, buffer);
    return buffer;
  } catch (error) {
    console.error(`[og/google-font] failed to load ${family} ${weight}:`, error);
    fontCache.set(cacheKey, null);
    return null;
  }
}
