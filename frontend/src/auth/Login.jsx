import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!email) {
      return setError('Please enter your email to reset password.');
    }
    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      alert('Password reset email sent!');
    } catch (err) {
      setError('Failed to send reset email.');
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-slate-300 p-10 rounded-4xl shadow-2xl relative overflow-hidden">
        {/* Subtle branding hint */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-slate-900/5 blur-[120px] rounded-full"></div>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="p-4 bg-slate-900 rounded-2xl shadow-lg shadow-blue-900/40 mb-4 transform -rotate-3">
              <Package size={32} className="text-slate-900" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-700 font-medium">Login to manage S-BAKO ShopHub inventory</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 ml-1 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
                  id="email"
                  name="email"
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="name@shophub.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 ml-1 uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  rememberMe ? 'bg-slate-900 border-slate-900' : 'border-slate-300 group-hover:border-slate-500'
                }`}>
                  {rememberMe && <Package size={12} className="text-slate-900" />}
                </div>
                <span className="text-xs font-medium text-slate-700 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Remember Me</span>
              </label>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-slate-900/10 transition-all transform active:scale-[0.98] mb-4"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6 space-y-4">
            <p className="text-slate-400 text-sm font-medium">
              Need an account?{' '}
              <Link
                to="/register"
                className="text-slate-900 hover:text-blue-600 font-bold decoration-dotted underline underline-offset-4"
              >
                Sign Up
              </Link>
            </p>
            <button
              onClick={handleResetPassword}
              className="text-slate-700 hover:text-slate-900 text-sm transition-colors font-medium block mx-auto underline decoration-dotted underline-offset-4"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
