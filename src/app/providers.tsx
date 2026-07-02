"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import EmotionRegistry from "./registry";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <Provider store={store}>{children}</Provider>
    </EmotionRegistry>
  );
}
