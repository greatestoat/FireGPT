import React, { useRef } from "react";
import { ModelOption } from "../types";
import { SendIcon } from "../icons";
import ModelSwitcher from "./ModelSwitcher";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  activeDocName: string;
  selectedModel: ModelOption;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onModelSelect: (model: ModelOption) => void;
}

export default function ChatInput({
  input,
  isLoading,
  activeDocName,
  selectedModel,
  onInputChange,
  onSend,
  onModelSelect,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    // Auto-grow textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // Expose ref so parent can focus textarea (e.g. when suggestion chip is clicked)
  return (
    <div className="input-area">
      <div className="input-wrapper">
        <div className="input-inner">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything about ${activeDocName}…`}
            rows={1}
            disabled={isLoading}
          />

          <div className="input-actions">
            <ModelSwitcher selected={selectedModel} onSelect={onModelSelect} />
            <button
              className="send-btn"
              onClick={onSend}
              disabled={!input.trim() || isLoading}
            >
              <SendIcon />
            </button>
          </div>
        </div>

        <div className="input-hint">
          Enter to send · Shift+Enter for new line · Switch AI model with the pill
        </div>
      </div>
    </div>
  );
}