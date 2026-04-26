import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, BookOpen, FolderKanban, MessageSquare,
  Compass, Home as HomeIcon, ChevronLeft,
} from "lucide-react";

// ✅ Fix 2: use render functions instead of JSX elements in data
const navItems = [
  { label: "Home",     icon: () => <HomeIcon size={20} />,        path: "/fire-gpt" },
  { label: "Projects", icon: () => <FolderKanban size={20} />,    path: "/projects" },
  { label: "AI Chat",  icon: () => <MessageSquare size={20} />,   path: "/chat" },
  { label: "Notebook", icon: () => <BookOpen size={20} />,        path: "/notebook" },
];

const features = [
  { title: "About GPT", desc: "Learn how AI works",  icon: () => <Sparkles size={20} />,     path: "/fire-gpt/about" },
  { title: "Notebook",  desc: "Write & save ideas",  icon: () => <BookOpen size={20} />,     path: "/fire-gpt/notebook" },
  { title: "Projects",  desc: "Generate full apps",  icon: () => <FolderKanban size={20} />, path: "/fire-gpt/projects" },
  { title: "AI Chat",   desc: "Talk with AI",        icon: () => <MessageSquare size={20} />,path: "/fire-gpt/chat" },
  { title: "Explore",   desc: "Discover features",   icon: () => <Compass size={20} />,      path: "/fire-gpt/explore" },
];

// ✅ Fix 1: component is no longer named "Home" — no conflict
export default function FireGPTHome() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");

  return (
    <div className="flex min-h-screen bg-[#0b0f1a] text-white overflow-hidden">

      {/* ── SIDEBAR ── */}
      <nav
        className={`relative z-20 flex flex-col gap-1 border-r border-gray-800 bg-[#111827]/95 backdrop-blur-xl transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
        style={{ padding: "16px 10px" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 pb-3 mb-2 border-b border-gray-800 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-base flex-shrink-0">
            🔥
          </div>
          <span
            className={`font-extrabold text-sm bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent whitespace-nowrap transition-all duration-200 overflow-hidden ${
              collapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
          >
            FireGPT
          </span>
        </div>

        {/* Nav Items */}
        {navItems.map((item) => {
          const Icon = item.icon; // ✅ capitalised so JSX treats it as a component
          return (
            <div
              key={item.label}
              onClick={() => { setActiveNav(item.label); navigate(item.path); }}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                activeNav === item.label
                  ? "bg-blue-500/15 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"
                  : "text-gray-500 hover:bg-blue-500/10 hover:text-gray-200"
              }`}
            >
              <span className="flex-shrink-0"><Icon /></span>
              <span
                className={`text-[13.5px] font-medium whitespace-nowrap transition-all duration-200 overflow-hidden ${
                  collapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`mt-auto self-end flex items-center justify-center w-9 h-9 rounded-lg border border-gray-800 bg-white/5 text-gray-500 hover:bg-blue-500/15 hover:text-blue-400 transition-all duration-300 ${
            collapsed ? "rotate-180 self-center" : ""
          }`}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="relative flex-1 overflow-y-auto px-8 py-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-14">
            <h1 className="text-5xl font-bold leading-tight">
              Build with <span className="text-blue-500">AI</span> faster
            </h1>
            <p className="text-gray-400 mt-4 text-lg">
              FireGPT helps you chat, create apps, and manage ideas — all in one place.
            </p>
            <button
              onClick={() => navigate("/fire-gpt/chat")}
              className="mt-6 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-medium shadow-lg shadow-blue-500/20"
            >
              Start Chatting →
            </button>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, i) => {
              const Icon = item.icon; // ✅ same pattern
              return (
                <div
                  key={i}
                  onClick={() => navigate(item.path)}
                  className="group cursor-pointer rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/30 to-purple-500/20 hover:from-blue-500/60 hover:to-purple-500/40 transition"
                >
                  <div className="rounded-2xl bg-[#111827]/90 backdrop-blur-xl p-6 h-full border border-gray-800 group-hover:border-blue-500 transition">
                    <div className="mb-4 text-blue-400"><Icon /></div>
                    <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                    <div className="mt-4 text-blue-500 opacity-0 group-hover:opacity-100 transition">→</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-20 text-center text-gray-500 text-sm">
            FireGPT • AI Workspace 🚀
          </div>
        </div>
      </main>
    </div>
  );
}