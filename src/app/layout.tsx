import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEROS Crew Portal",
  description: "Log hours, submit claims and track your pay.",
  applicationName: "BEROS Crew",
  appleWebApp: { capable: true, title: "BEROS Crew", statusBarStyle: "default" },
  // Internal portal: never index (also sent as an X-Robots-Tag header).
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f5f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-page font-sans text-ink">{children}</body>
    </html>
  );
}
