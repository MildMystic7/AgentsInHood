import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge 01 Result | AgentsInHood",
  description:
    "Inspect the verified result, fixed rules, and confirmed Robinhood Chain execution ledger from AgentsInHood Challenge 01.",
};

export default function ChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
