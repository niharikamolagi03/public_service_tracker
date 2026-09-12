import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaShieldAlt, FaEye, FaEyeSlash, FaSignInAlt, FaLock, FaUser } from 'react-icons/fa';
import { ButtonSpinner } from '../components/LoadingSpinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = await login(form.username, form.password);
    setLoading(false);
    if (user) navigate(user.role === 'citizen' ? '/dashboard' : '/admin');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FaShieldAlt className="text-white text-lg" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">CivicRedress</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your complaints,<br />
            <span className="text-purple-300">resolved faster.</span>
          </h2>
          <p className="text-purple-200 text-lg leading-relaxed">
            AI-powered civic grievance platform that routes your complaint to the right government department instantly.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '⚡', label: 'AI auto-categorization & routing' },
            { icon: '📍', label: 'Real-time status tracking' },
            { icon: '🔔', label: 'Instant notifications on updates' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 text-purple-100">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
              <FaShieldAlt className="text-white text-sm" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-wide">CivicRedress</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Welcome back</h1>
            <p className="text-slate-500 mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username or Email</label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm transition"
                  placeholder="Enter your username" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input required type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm transition"
                  placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:from-violet-700 hover:to-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-purple-200 text-sm">
              {loading ? <ButtonSpinner /> : <><FaSignInAlt /> Sign In to Your Account</>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-600 font-semibold hover:text-violet-800 hover:underline transition">
              Create one free →
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-4 p-4 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-xs font-semibold text-violet-700 mb-2 uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Admin</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-violet-100">admin / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Officer</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-violet-100">officer_elec / officer123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Citizen</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-violet-100">citizen1 / citizen123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
