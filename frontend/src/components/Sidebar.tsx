import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import {
  Home,
  Folder,
  BookOpen,
  Settings,
  User,
  MessageSquare,
} from "lucide-react";

interface Chat {
  id: string;
  title: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  /* ================= MENU ITEMS ================= */
  const menuItems = [
    { name: "Home", icon: Home, path: "/home" },
    { name: "Projects", icon: Folder, path: "/projects" },
    { name: "Notebook", icon: BookOpen, path: "/notebook" },
    { name: "Chats", icon: MessageSquare, path: "/chat" },
    { name: "Profile", icon: User, path: "/profile" },
    { name: "Settings", icon: Settings, path: "/profile" },
  ];

  /* ================= FETCH CHATS ================= */
  const fetchChats = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data);
    } catch {
      console.error("Failed to fetch chats");
    }
  };

  useEffect(() => {
    fetchChats();
  }, [location.pathname]);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/user/profile");
        setProfile(data.user);
      } catch {
        console.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= DELETE CHAT ================= */
  const handleDelete = async (chatId: string) => {
    try {
      await api.delete(`/chat/${chatId}`);
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));

      if (location.pathname === `/chat/${chatId}`) {
        navigate("/chat");
      }
    } catch {
      console.error("Delete failed");
    }
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* SIDEBAR */}
      <div
        className={`h-full flex flex-col bg-[#111] text-white transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "w-64 min-w-[16rem]" : "w-16 min-w-[4rem]"
        }`}
      >
        {/* HEADER */}
        <div className="p-4 font-semibold border-b border-gray-800 flex items-center justify-between">
          {isOpen && <span>FireGPT</span>}

          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-gray-700"
          >
            ☰
          </button>
        </div>

        {/* NEW CHAT */}
        <button
          onClick={() => navigate("/chat")}
          className="m-3 p-2 bg-gray-800 rounded hover:bg-gray-700 text-sm"
        >
          {isOpen ? "+ New Chat" : "+"}
        </button>

        {/* MENU */}
        <div className="mt-2 space-y-1 px-2">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <div
                key={i}
                onClick={() => navigate(item.path)}
                className={`flex items-center ${
                  isOpen ? "justify-start" : "justify-center"
                } gap-3 p-2 rounded cursor-pointer transition
                ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={20} />
                {isOpen && <span className="text-sm">{item.name}</span>}
              </div>
            );
          })}
        </div>

        {/* CHAT LIST */}
        <div className="flex-1 overflow-y-auto mt-3">
          {isOpen &&
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="relative group px-4 py-2 text-sm hover:bg-gray-800 cursor-pointer flex justify-between items-center"
              >
                <span className="truncate">{chat.title}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(
                      openMenuId === chat.id ? null : chat.id
                    );
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
                >
                  ⋮
                </button>

                {openMenuId === chat.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-6 top-8 bg-[#1f1f1f] border border-gray-700 rounded shadow-lg z-50"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(chat.id);
                        setOpenMenuId(null);
                      }}
                      className="block px-4 py-2 text-sm hover:bg-red-600 hover:text-white w-full text-left"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* USER */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            className="p-4 border-t border-gray-800 flex items-center gap-3 cursor-pointer hover:bg-gray-800 transition"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold">
              {getInitials(profile?.username)}
            </div>

            {isOpen && (
              <span className="text-sm text-gray-300 truncate">
                {profile?.username}
              </span>
            )}
          </div>

          {profileOpen && profile && (
            <div className="absolute bottom-16 left-3 w-64 bg-[#181818] border border-gray-700 rounded-2xl shadow-2xl z-50 p-4 space-y-3">
              <div>
                <p className="text-white font-semibold">
                  {profile.username}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {profile.email}
                </p>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-white/80"
                >
                  View Profile
                </button>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 text-sm text-red-400"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OPEN BUTTON */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-3 left-3 z-50 text-gray-400 hover:text-white transition p-1.5 rounded hover:bg-gray-700 bg-[#111]"
        >
          ☰
        </button>
      )}

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-4">
              Sign out?
            </h3>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-gray-600 text-white/60"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400"
              >
                {isLoggingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;