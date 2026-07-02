import { configureStore } from "@reduxjs/toolkit";
import agents from "./agentsSlice";

export const store = configureStore({
  reducer: { agents },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
