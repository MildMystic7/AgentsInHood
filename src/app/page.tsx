"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { fetchHistory, fetchSummary } from "@/store/agentsSlice";
import Header from "@/components/Header";
import MarketTicker from "@/components/MarketTicker";
import Leaderboard from "@/components/Leaderboard";
import Trajectories from "@/components/Trajectories";
import MeetTheAgents from "@/components/MeetTheAgents";
import TradeActivity from "@/components/TradeActivity";
import AIReasoning from "@/components/AIReasoning";
import HowItWorks from "@/components/HowItWorks";
import AgentModal from "@/components/AgentModal";

export default function Page() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchSummary());
    dispatch(fetchHistory());
    const s = setInterval(() => dispatch(fetchSummary()), 4000);
    const h = setInterval(() => dispatch(fetchHistory()), 9000);
    return () => {
      clearInterval(s);
      clearInterval(h);
    };
  }, [dispatch]);

  return (
    <main>
      <Header />
      <MarketTicker />
      <Leaderboard />
      <Trajectories />
      <MeetTheAgents />
      <TradeActivity />
      <AIReasoning />
      <HowItWorks />
      <AgentModal />
    </main>
  );
}
