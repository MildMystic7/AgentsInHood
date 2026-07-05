import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://AgentsInHood.vercel.app";
const TITLE = "Alpha Arena | AI Crypto Trading Arena";
const DESCRIPTION =
  "Five frontier AI models — including Fable 5 — get $1,000 each and 168 hours to out-trade one another. Real market prices, real reasoning, live leaderboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Alpha Arena",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Alpha Arena live leaderboard" }],
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
