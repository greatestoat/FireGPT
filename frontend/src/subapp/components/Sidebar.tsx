import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, User, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubAppChat } from '../services/subAppApi';

interface SidebarProps {
  chats: SubAppChat[];
  chatId?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  // New Profile Props
  profile: any; 
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  chats, chatId, isOpen, setIsOpen, onNewChat, onSelectChat, onDeleteChat, profile 
}) => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className={`${isOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-slate-900 text-white flex flex-col overflow-hidden border-r border-slate-800 shadow-2xl relative`}>
      
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
        {isOpen && (
          <button 
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl transition-all font-medium text-sm mr-2 shadow-lg shadow-indigo-500/20"
          >
            <PlusCircle size={18} />
            <span>New Chat</span>
          </button>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors ${!isOpen && 'w-full flex justify-center'}`}
        >
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
        {isOpen && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-4">Recent Conversations</p>}
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
              chatId === chat.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={18} className="shrink-0" />
              {isOpen && <span className="truncate text-sm font-medium">{chat.title || 'Untitled Chat'}</span>}
            </div>
            {isOpen && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar Footer (User Profile Section) */}
      <div className="relative border-t border-slate-800/50" ref={profileRef}>
        <div 
          onClick={() => setProfileOpen(!profileOpen)}
          className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${!isOpen && 'justify-center'}`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ring-2 ring-slate-800">
            {getInitials(profile?.username)}
          </div>

          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{profile?.username || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">Pro Account</p>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        {profileOpen && isOpen && (
          <div className="absolute bottom-20 left-4 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-3 border-b border-slate-700/50 mb-1">
              <p className="text-white font-semibold text-sm">{profile?.username}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
            </div>
            <button
              onClick={() => { setProfileOpen(false); navigate("/profile"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700 text-sm text-slate-200 transition-colors"
            >
              <User size={16} /> View Profile
            </button>
           
          </div>
        )}
      </div>
    </aside>
  );
};