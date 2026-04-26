import { JSX } from "react";
import React from "react";

// ─── Format file size ─────────────────────────────────────────────────────────
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
export function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split("\n");
  const result: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      result.push(
        <h3 key={i} style={{ color: "var(--accent)", fontSize: "0.9rem", fontWeight: 700, margin: "12px 0 4px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      result.push(
        <h2 key={i} style={{ color: "var(--fg)", fontSize: "1rem", fontWeight: 700, margin: "14px 0 6px" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      result.push(
        <p key={i} style={{ fontWeight: 700, color: "var(--fg)", margin: "4px 0" }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      result.push(
        <li key={i} style={{ margin: "3px 0 3px 16px", color: "var(--fg-dim)", lineHeight: 1.6 }}>
          {line.slice(2)}
        </li>
      );
    } else if (line.trim() === "") {
      result.push(<br key={i} />);
    } else {
      // Inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const inline = parts.map((p, j) =>
        j % 2 === 1
          ? <strong key={j} style={{ color: "var(--fg)", fontWeight: 700 }}>{p}</strong>
          : p
      );
      result.push(
        <p key={i} style={{ margin: "3px 0", color: "var(--fg-dim)", lineHeight: 1.7 }}>
          {inline}
        </p>
      );
    }
    i++;
  }

  return result;
}