import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | AgentsInHood",
  description:
    "How AgentsInHood works: five AI models trading Robinhood-listed stocks, the deterministic engine, the metrics, the API, and the $ALPHA token on Robinhood Chain.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
