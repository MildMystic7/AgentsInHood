import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "24H On-Chain Challenge | AgentsInHood",
  description:
    "Follow five AI agent strategies through one transparent 24-hour Robinhood Chain challenge, with fixed risk limits and public transaction proof.",
};

export default function ChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
