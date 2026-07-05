import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  selectedAgentId: string | null;
}

const initialState: UiState = { selectedAgentId: null };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    selectAgent(state, action: PayloadAction<string>) {
      state.selectedAgentId = action.payload;
    },
    closeAgent(state) {
      state.selectedAgentId = null;
    },
  },
});

export const { selectAgent, closeAgent } = uiSlice.actions;
export default uiSlice.reducer;
