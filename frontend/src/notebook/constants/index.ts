// import { ModelOption } from "../types";
import { ModelOption } from "../types";

// ─── API Base URL ─────────────────────────────────────────────────────────────
export const API = "http://localhost:5000/api/pdf";

// ─── Available Models ─────────────────────────────────────────────────────────
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gemini-flash",
    label: "Gemini 1.5 Flash",
    shortLabel: "Gemini",
    provider: "gemini",
    model: "gemini-1.5-flash",
    color: "#4285f4",
    colorDim: "rgba(66,133,244,0.15)",
    borderColor: "rgba(66,133,244,0.35)",
  },
  {
    id: "gemini-pro",
    label: "Gemini 1.5 Pro",
    shortLabel: "Gemini Pro",
    provider: "gemini",
    model: "gemini-1.5-pro",
    color: "#34a853",
    colorDim: "rgba(52,168,83,0.15)",
    borderColor: "rgba(52,168,83,0.35)",
  },
  {
    id: "gpt4o-mini",
    label: "GPT-4o Mini",
    shortLabel: "GPT-4o Mini",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    color: "#10a37f",
    colorDim: "rgba(16,163,127,0.15)",
    borderColor: "rgba(16,163,127,0.35)",
  },
  {
    id: "claude-haiku",
    label: "Claude 3 Haiku",
    shortLabel: "Claude Haiku",
    provider: "openrouter",
    model: "anthropic/claude-3-haiku",
    color: "#c8a97e",
    colorDim: "rgba(200,169,126,0.15)",
    borderColor: "rgba(200,169,126,0.35)",
  },
  {
    id: "llama3",
    label: "Llama 3.1 8B",
    shortLabel: "Llama 3.1",
    provider: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    color: "#7e6af5",
    colorDim: "rgba(126,106,245,0.15)",
    borderColor: "rgba(126,106,245,0.35)",
  },
];