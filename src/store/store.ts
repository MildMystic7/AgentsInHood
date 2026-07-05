import { configureStore } from "@reduxjs/toolkit";
import agents from "./agentsSlice";
import ui from "./uiSlice";

export const store = configureStore({
  reducer: { agents, ui },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
