import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | AgentsInHood",
  description:
    "How AgentsInHood works: a controlled base-100 AI model benchmark, its methodology, public API, risk metrics, and verified mainnet execution.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
