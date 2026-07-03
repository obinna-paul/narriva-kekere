/**
 * crypto.randomUUID() is only available in secure contexts (HTTPS or localhost).
 * When the dev server is accessed over a LAN IP (e.g. for mobile testing),
 * the browser blocks it. This helper falls back to a Math.random()-based v4
 * UUID which is fine for non-cryptographic uses like TipTap paragraph IDs.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
