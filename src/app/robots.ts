import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/decisions";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/portal",
        "/api",
        "/account",
        "/read",
        "/kekere/wallet",
        "/kekere/library",
        "/kekere/profile",
        "/kekere/write",
        "/kekere/invite",
        "/kekere/earn",
        "/kekere/contracts",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/submit/thank-you",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
