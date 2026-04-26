import React, { useState, useRef, useEffect } from "react";
import { ModelOption } from "../types";

import { MODEL_OPTIONS } from "../constants";
import { ChevronDownIcon, CheckIcon } from "../icons";

// ─── Single row inside the dropdown ──────────────────────────────────────────
function ModelRow({
  model,
  selected,
  onSelect,
}: {
  model: ModelOption;
  selected: ModelOption;
  onSelect: (m: ModelOption) => void;
}) {
  const isActive = selected.id === model.id;

  return (
    <button
      onClick={() => onSelect(model)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 10px",
        background: isActive ? model.colorDim : "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.8rem",
        color: isActive ? model.color : "var(--fg-dim)",
        textAlign: "left",
        transition: "all 0.12s",
        borderRadius: 6,
        margin: "1px 4px",
        width: "calc(100% - 8px)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: model.color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{model.label}</span>
      {isActive && (
        <span style={{ color: model.color }}>
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

// ─── Model switcher pill + dropdown ──────────────────────────────────────────
export default function ModelSwitcher({
  selected,
  onSelect,
}: {
  selected: ModelOption;
  onSelect: (m: ModelOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const geminiModels = MODEL_OPTIONS.filter((m) => m.provider === "gemini");
  const openrouterModels = MODEL_OPTIONS.filter((m) => m.provider === "openrouter");

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* ── Pill trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 9px 4px 8px",
          background: selected.colorDim,
          border: `1px solid ${selected.borderColor}`,
          borderRadius: 20,
          color: selected.color,
          fontSize: "0.72rem",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          transition: "all 0.2s",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: selected.color,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {selected.shortLabel}
        <span
          style={{
            opacity: 0.7,
            marginLeft: 1,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "flex",
          }}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            minWidth: 210,
            background: "var(--bg3)",
            border: "1px solid var(--border-light)",
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            zIndex: 200,
            overflow: "hidden",
            animation: "fadeSlideUp 0.15s ease",
          }}
        >
          {/* Gemini group */}
          <div
            style={{
              padding: "8px 10px 4px",
              fontSize: "0.65rem",
              color: "var(--fg-muted)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Google Gemini
          </div>
          {geminiModels.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              selected={selected}
              onSelect={(m) => { onSelect(m); setOpen(false); }}
            />
          ))}

          <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />

          {/* OpenRouter group */}
          <div
            style={{
              padding: "4px 10px 4px",
              fontSize: "0.65rem",
              color: "var(--fg-muted)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            OpenRouter
          </div>
          {openrouterModels.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              selected={selected}
              onSelect={(m) => { onSelect(m); setOpen(false); }}
            />
          ))}

          <div
            style={{
              padding: "6px 10px 8px",
              fontSize: "0.67rem",
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            OpenRouter models require{" "}
            <code
              style={{
                background: "var(--bg)",
                padding: "1px 4px",
                borderRadius: 4,
                fontSize: "0.65rem",
              }}
            >
              OPENROUTER_API_KEY
            </code>
          </div>
        </div>
      )}
    </div>
  );
}