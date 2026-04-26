import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subAppApi, SubAppMessage, SubAppChat } from './services/subAppApi';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { useAuth } from '../context/AuthContext'; // Ensure this path is correct

const SubApp: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Getting the user profile data
  
  const [chats, setChats] = useState<SubAppChat[]>([]);
  const [messages, setMessages] = useState<SubAppMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const appType = 'default';

  // 1. Load sidebar chats on mount
  useEffect(() => { 
    loadChats(); 
  }, []);

  // 2. Load specific chat messages when URL ID changes
  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    } else {
      setMessages([]); // Reset messages for a new chat view
    }
  }, [chatId]);

  // 3. Auto-scroll to bottom whenever messages change or AI is typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadChats = async () => {
    try {
      const data = await subAppApi.getChats(appType);
      setChats(data);
    } catch (err) { 
      console.error("Chat List Error:", err); 
    }
  };

  const loadMessages = async (id: string) => {
    try {
      const data = await subAppApi.getMessages(id);
      setMessages(data);
    } catch (err) { 
      console.error("Message Load Error:", err); 
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setLoading(true);

    try {
      // Send the message to your API
      const response = await subAppApi.sendMessage(userMsg, chatId || undefined, appType);
      
      // Handle Routing: If this was a new chat, the API returns a new subChatId
      if (!chatId && response.subChatId) {
        // This updates the URL to /subapp/{id}, triggering the useEffect to load messages
        navigate(`/subapp/${response.subChatId}`);
        await loadChats(); // Refresh the sidebar so the new chat appears in history
      } else if (chatId) {
        // If we're already in a chat, just fetch the updated message list
        await loadMessages(chatId);
      }
    } catch (err) { 
        console.error("Send Error:", err); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await subAppApi.deleteChat(id);
      setChats(prev => prev.filter(c => c.id !== id));
      // If the user deleted the chat they are currently looking at, move them to the new chat screen
      if (chatId === id) {
        navigate('/subapp');
      }
    } catch (err) { 
      console.error("Delete Error:", err); 
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans antialiased text-slate-900">
      {/* Sidebar with Profile Integrated */}
      <Sidebar 
        chats={chats} 
        chatId={chatId} 
        profile={user} // Passing the user object for the footer initials/name
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        onNewChat={() => navigate('/subapp')}
        onSelectChat={(id) => navigate(`/subapp/${id}`)}
        onDeleteChat={handleDelete}
      />

      {/* Main Chat Area */}
      <ChatArea 
        messages={messages}
        input={input}
        setInput={setInput}
        loading={loading}
        onSend={handleSend}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
};

export default SubApp;
