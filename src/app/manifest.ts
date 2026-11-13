import type { MetadataRoute } from "next";

/** Lets crew add the portal to their phone's home screen with the BEROS icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BEROS Crew Portal",
    short_name: "BEROS Crew",
    description: "Log hours, submit claims and track your pay.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#f6f6f6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
