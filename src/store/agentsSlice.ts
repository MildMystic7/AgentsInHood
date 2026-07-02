import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { HistoryResponse, SummaryResponse } from "@/engine/types";

interface AgentsState {
  summary: SummaryResponse | null;
  history: HistoryResponse | null;
  status: "idle" | "loading" | "ready" | "error";
  lastUpdated: number | null;
}

const initialState: AgentsState = {
  summary: null,
  history: null,
  status: "idle",
  lastUpdated: null,
};

export const fetchSummary = createAsyncThunk("agents/fetchSummary", async () => {
  const res = await fetch("/api/agents/summary", { cache: "no-store" });
  if (!res.ok) throw new Error("summary failed");
  return (await res.json()) as SummaryResponse;
});

export const fetchHistory = createAsyncThunk("agents/fetchHistory", async () => {
  const res = await fetch("/api/agents/history", { cache: "no-store" });
  if (!res.ok) throw new Error("history failed");
  return (await res.json()) as HistoryResponse;
});

const agentsSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummary.pending, (state) => {
        if (state.status === "idle") state.status = "loading";
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.status = "ready";
        state.lastUpdated = Date.now();
      })
      .addCase(fetchSummary.rejected, (state) => {
        if (state.status !== "ready") state.status = "error";
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  },
});

export default agentsSlice.reducer;
