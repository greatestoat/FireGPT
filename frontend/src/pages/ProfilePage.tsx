import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import type { User } from '../types';

const ProfilePage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ✅ NEW STATES
  const [usage, setUsage] = useState({
    totalChats: 0,
    totalMessages: 0,
    tokensUsed: 0,
    lastActive: '',
  });

  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/user/profile');
        setProfile(data.user);
      } catch {
        setError('Failed to load profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUsage = async () => {
      try {
        const { data } = await api.get('/user/usage');
        setUsage(data.usage);
      } catch {
        // silent fail
      }
    };

    fetchProfile();
    fetchUsage();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-ink-500 to-ink-700',
      'from-purple-500 to-ink-600',
      'from-blue-500 to-ink-500',
      'from-teal-500 to-blue-600',
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-white/40 text-sm font-mono">FireGPT</span>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-2 rounded-xl border border-border text-white/50 hover:text-red-400 text-sm transition-all"
          >
            Sign Out
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="card p-12 flex justify-center">
            <div className="w-10 h-10 border-2 border-ink-500/30 border-t-ink-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="error-banner">{error}</div>
        )}

        {/* Profile */}
        {!isLoading && profile && (
          <div className="space-y-4">

            {/* Main Card */}
            <div className="card p-8">
              <div className="flex items-start gap-6">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                    profile.username
                  )} flex items-center justify-center text-white font-bold text-2xl`}
                >
                  {getInitials(profile.username)}
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {profile.username}
                  </h1>
                  <p className="text-white/50 text-sm">{profile.email}</p>
                  <p className="text-white/25 text-xs mt-2">
                    ID: {profile.id.slice(0, 8)}…
                  </p>
                </div>
              </div>
            </div>

            {/* Existing Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label">Email</p>
                <p className="text-white text-sm truncate">
                  {profile.email}
                </p>
              </div>

              <div className="card p-5">
                <p className="label">Member Since</p>
                <p className="text-white text-sm">
                  {formatDate(profile.memberSince)}
                </p>
              </div>
            </div>

            {/* ✅ Profile Information Section */}
            <div className="card p-6">
              <h2 className="text-white font-semibold mb-4">
                Profile Information
              </h2>

              <div className="space-y-2 text-sm text-white/70">
                <p><span className="label">Username:</span> {profile.username}</p>
                <p><span className="label">Email:</span> {profile.email}</p>
                <p><span className="label">User ID:</span> {profile.id}</p>
              </div>

              {/* <button
                className="mt-4 px-4 py-2 rounded-xl border border-border text-white/60 hover:text-white text-sm"
              >
                Change Password
              </button> */}
            </div>

            {/* ✅ Usage Statistics */}
            <div className="card p-6">
              <h2 className="text-white font-semibold mb-4">
                Usage Statistics
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="label">Total Chats</p>
                  <p className="text-white">{usage.totalChats}</p>
                </div>

                <div>
                  <p className="label">Messages Sent</p>
                  <p className="text-white">{usage.totalMessages}</p>
                </div>

                <div>
                  <p className="label">Tokens Used</p>
                  <p className="text-white">{usage.tokensUsed}</p>
                </div>

                <div>
                  <p className="label">Last Active</p>
                  <p className="text-white">
                    {usage.lastActive ? formatDate(usage.lastActive) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ API Key Section */}
            <div className="card p-6">
              <h2 className="text-white font-semibold mb-4">
                API Key
              </h2>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenRouter / OpenAI key"
                className="w-full px-4 py-2 rounded-xl bg-background border border-border text-white text-sm"
              />

              <button
                className="mt-3 px-4 py-2 rounded-xl bg-ink-500/20 text-ink-400 text-sm"
              >
                Save API Key
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-4">
              Sign out?
            </h3>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-border text-white/60"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400"
              >
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;