import type { MetadataRoute } from "next";

/** Internal crew portal: ask every search engine and crawler to stay out. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
