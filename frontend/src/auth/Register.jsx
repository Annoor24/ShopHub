import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Package, Lock, Mail, AlertCircle, User, Check } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, updateUserData, sendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invitedStoreId = queryParams.get('storeId');

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);
      
      // Create account
      const userCredential = await signup(email, password);
      
      // Create initial profile document explicitly
      const initialProfile = { 
        name,
        email: email,
        role: 'staff',
        createdAt: new Date().toISOString(),
        allowedStoreIds: invitedStoreId ? [invitedStoreId] : []
      };
      
      await setDoc(doc(db, "users", userCredential.user.uid), initialProfile, { merge: true });

      // Send verification email automatically
      await sendVerification();
      
      navigate('/verify-email');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
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
            <div className="p-4 bg-slate-900 rounded-2xl shadow-lg shadow-blue-900/40 mb-4 transform rotate-3">
              <Package size={32} className="text-slate-900" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-700 font-medium">Join the S-BAKO ShopHub staff team</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 ml-1 uppercase tracking-widest">Full Name (Optional)</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 ml-1 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 ml-1 uppercase tracking-widest">Confirm Password</label>
              <div className="relative group">
                <Check className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-slate-900/10 transition-all transform active:scale-[0.98] mt-4"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center mt-8">
            <p className="text-slate-400 text-sm font-medium">
              Already have an account?{' '}
              <Link
                to="/"
                className="text-slate-900 hover:text-blue-600 font-bold decoration-dotted underline underline-offset-4"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
