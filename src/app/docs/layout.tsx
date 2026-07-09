import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | AlphaHood",
  description:
    "How AlphaHood works: five AI models trading Robinhood-listed coins, the deterministic engine, the metrics, the API, and the $ALPHA token on Robinhood Chain.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
