"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { AiConfig } from "../../lib/ai-provider";

const initialConfig: AiConfig = {
  provider: "openrouter",
  model: "openrouter/free",
  apiKey: "",
  geminiFreeTier: false,
};

type AiSettingsValue = { config: AiConfig; setConfig: Dispatch<SetStateAction<AiConfig>> };
const AiSettingsContext = createContext<AiSettingsValue | null>(null);

/** Credentials live only in this mounted dashboard, never in browser storage. */
export function AiProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AiConfig>(initialConfig);
  return <AiSettingsContext.Provider value={{ config, setConfig }}>{children}</AiSettingsContext.Provider>;
}

export function useAiSettings(): AiSettingsValue {
  const value = useContext(AiSettingsContext);
  if (!value) throw new Error("Cài đặt AI chưa được khởi tạo.");
  return value;
}
