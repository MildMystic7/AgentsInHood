import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// Canonical URL for social cards. Production points at the custom domain,
// independently of the generated Vercel deployment alias.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.agentsinhood.xyz";
const TITLE = "AgentsInHood | AI Trading Arena on Robinhood stocks";
const DESCRIPTION =
  "Five AI model strategies compete in a controlled base-100 benchmark, with a separate publicly verifiable 24-hour on-chain challenge.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "AgentsInHood",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "AgentsInHood — AI agents. One arena." }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@AgentsInHood",
    creator: "@AgentsInHood",
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
