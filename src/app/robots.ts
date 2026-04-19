import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/seo/site";

const privateDisallowRules = [
  "/athlete",
  "/coach",
  "/individual",
  "/dashboard",
  "/join",
  "/fitstart",
  "/welcome",
  "/role-selection",
  "/onboarding",
  "/daily-checkin",
  "/weekly-review",
  "/analysis",
  "/peak",
  "/plan",
  "/results",
  "/learn",
  "/offline",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/verification-success",
  "/api",
  "/auth",
  "/test-results",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/sitemap.xml", "/robots.txt", "/llms.txt", "/humans.txt", "/manifest.webmanifest"],
      disallow: privateDisallowRules,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
