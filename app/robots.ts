import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages; they are also marked noindex.
      disallow: ["/admin", "/account", "/api/", "/cart", "/checkout", "/order-success", "/orders", "/login", "/register"],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
