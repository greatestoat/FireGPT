import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from 'react-hot-toast';

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
// import Home from "./pages/Home";
import Home from "./pages/Home/Home";
import FireGPT from "./pages/Home/FireGPT";
// import { AboutGPT, Notebook, Projects } from "./pages/Features";
import { AboutGPT } from "./pages/home/AboutGPT";
import { Notebook } from "./pages/home/Notebook";
import { Projects } from "./pages/home/Projects";
import { AIChat } from "./pages/home/AIChat";
import { Explore } from "./pages/home/Explore";
import SearchPage from "./pages/SearchPage";

import ChatLayout from "./layout";
import NotebookApp from "./notebook/NotebookApp"
import SubApp from "./subapp/SubApp";
import { ProjectsPage } from "./editor/pages/ProjectsPage";
import { ProjectPage } from "./editor/pages/ProjectPage";



const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
     <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notebook" element={<NotebookApp />} />
          {/* <Route path="/subapp" element={<SubApp />} /> */}
          <Route path="/subapp" element={<SubApp />} />
<Route path="/subapp/:chatId" element={<SubApp />} />
<Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />  // ✅ FIXED: Added ProtectedRoute wrapper
          
          
          
          

          {/* ================= PROTECTED ROUTES ================= */}

          {/* Chat routes (IMPORTANT FIX) */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />

          {/* Search */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Home */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/fire-gpt" element={<FireGPT />} />
        <Route path="/fire-gpt/about" element={<AboutGPT />} />
        <Route path="/fire-gpt/notebook" element={<Notebook />} />
        <Route path="/fire-gpt/projects" element={<Projects />} />
        <Route path="/fire-gpt/chat" element={<AIChat />} />
  <Route path="/fire-gpt/explore" element={<Explore />} />

          {/* ================= DEFAULT REDIRECT ================= */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
