import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge 02 Rules & Risk Notice | AgentsInHood",
  description:
    "Published mechanics, custody boundaries, settlement rules, and risks for the AgentsInHood Challenge 02 prediction vault.",
};

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
