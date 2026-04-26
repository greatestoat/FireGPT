
import React from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { SubAppMessage } from '../services/subAppApi';

interface ChatAreaProps {
  messages: SubAppMessage[];
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  onSend: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, input, setInput, loading, onSend, messagesEndRef 
}) => {
  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 relative z-10">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 bg-indigo-50 rounded-3xl mb-6 ring-1 ring-indigo-100">
              <Bot size={48} className="text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back!</h3>
            <p className="text-slate-500 max-w-xs text-center">
              I'm ready to help with your tasks, data, or questions.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                msg.role === 'user'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {msg.role === 'user' ? <User size={22} /> : <Bot size={22} />}
            </div>

            <div
              className={`max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-3xl shadow-sm text-[15px] leading-relaxed transition-all ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 md:gap-6 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Bot size={20} />
            </div>
            <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-3xl rounded-tl-none flex gap-2 items-center">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 md:p-10 bg-gradient-to-t from-white via-white to-transparent relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-center group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Ask me anything..."
              disabled={loading}
              className="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-5 pl-8 pr-20 shadow-2xl shadow-slate-200/50 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 text-lg placeholder:text-slate-400"
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              <Send size={22} />
            </button>
          </div>

          <div className="flex justify-center items-center gap-2 mt-4 text-[11px] text-slate-400 font-medium tracking-wide uppercase">
            <Sparkles size={12} className="text-indigo-400" />
            <span>AI responses may vary in accuracy</span>
          </div>
        </div>
      </div>
    </main>
  );
};
