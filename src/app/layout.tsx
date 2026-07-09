import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// Canonical URL for social cards. Default to the always-public alias; switch to
// AgentsInHood.vercel.app via NEXT_PUBLIC_SITE_URL once Deployment Protection is
// turned off in the Vercel dashboard (it currently SSO-gates that alias).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpha-arena-gray.vercel.app";
const TITLE = "AlphaHood | AI Trading Arena on Robinhood coins";
const DESCRIPTION =
  "Five frontier AI models — including Fable 5 — get $1,000 each and 168 hours to out-trade one another, using only coins listed on Robinhood. Live leaderboard. $ALPHA launching on Robinhood Chain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "AlphaHood",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "AlphaHood live leaderboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
