import { headers } from "next/headers";
import NarrivaNotFound from "@/app/(narriva)/not-found";
import KekereNotFound from "@/app/(kekere)/not-found";

/**
 * Root-level catch-all for URLs that don't match any route at all (e.g. a
 * typo'd path with no real segment to attach to) — Next only consults a
 * route group's own not-found.tsx when something *within* that group's
 * matched tree calls notFound() or fails a dynamic-segment lookup, not for
 * a path that fails to match anything from the very first segment. Without
 * this file, those requests fell through to Next's generic unstyled 404
 * instead of either brand's actual page. Mirrors middleware.ts's own
 * subdomain check to decide which brand to render.
 */
export default function RootNotFound() {
  const hostname = headers().get("host") ?? "";
  return hostname.startsWith("kekere.") ? <KekereNotFound /> : <NarrivaNotFound />;
}
