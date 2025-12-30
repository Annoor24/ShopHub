import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const { currentUser, sendVerification, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justSent, setJustSent] = useState(false);

  // Handle Send Verification Email
  async function handleSend() {
    try {
      setError('');
      setLoading(true);
      await sendVerification();
      setJustSent(true);
      setCountdown(30);
      setTimeout(() => setJustSent(false), 3000);
    } catch (err) {
      setError('Too many requests. Please wait a moment before trying again.');
      console.error(err);
    }
    setLoading(false);
  }

  // Trigger verification email automatically on mount
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified && !justSent) {
      handleSend();
    }
  }, []); // Only run once on mount

  // Countdown timer logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Auto-refresh logic to detect verification
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentUser && !currentUser.emailVerified) {
        await refreshUser();
      }
    }, 3000); // Check every 3 seconds
    
    if (currentUser?.emailVerified) {
      navigate('/dashboard');
    }
    
    return () => clearInterval(interval);
  }, [currentUser, refreshUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-10 rounded-3xl shadow-2xl relative overflow-hidden text-center">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/40 mb-6 transform -rotate-2">
            <Mail size={32} className="text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
          <p className="text-slate-400 mb-8 max-w-[280px]">
            We've sent a verification link to <br />
            <span className="text-blue-400 font-semibold break-all">{currentUser?.email}</span>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm w-full">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {justSent && (
            <div className="flex items-center gap-2 p-4 mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm w-full">
              <CheckCircle size={18} />
              Verification link sent!
            </div>
          )}

          <div className="space-y-4 w-full">
            <button
              onClick={handleSend}
              disabled={loading || countdown > 0}
              className="w-full py-4 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
            </button>

            <button
              onClick={() => logout()}
              className="w-full py-4 flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-700"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>

          <div className="mt-10 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50 w-full">
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Once you click the link in your email, this page will update and take you to the dashboard automatically."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
