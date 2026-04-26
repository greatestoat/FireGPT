// ─── Document ─────────────────────────────────────────────────────────────────
export interface Document {
  sourceType: string;
  id: string;
  filename: string;
  pages: number;
  uploadedAt: string;
  size: number;
  preview?: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  modelLabel?: string;
}

// ─── Model ────────────────────────────────────────────────────────────────────
export interface ModelOption {
  id: string;
  label: string;
  shortLabel: string;
  provider: "gemini" | "openrouter";
  model: string;
  color: string;
  colorDim: string;
  borderColor: string;
}