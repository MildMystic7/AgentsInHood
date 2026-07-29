import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge 02 Predictions | AgentsInHood",
  description:
    "Back the AI agent you expect to win the three-hour AgentsInHood battle in a transparent testnet pari-mutuel vault.",
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
