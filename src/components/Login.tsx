import React, { useState } from 'react';
import { Lock, User, Leaf } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  // onGoSignup: () => void;
  onGoForgot: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
console.log('API_BASE:', API_BASE);
const TOKEN_KEY = 'lomaa_token';

export const Login: React.FC<LoginProps> = ({ onLogin, onGoForgot }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Login failed (${res.status})`);

      }

      const data = await res.json();

      if (data?.token) {
        localStorage.setItem(TOKEN_KEY, data.token);

        if (data.user) localStorage.setItem('lomaa_user', JSON.stringify(data.user));
        onLogin();
      } else {
        throw new Error('No token returned from server');
      }
    } catch (err: any) {
      console.error('Login error', err);
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"></div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-[200px] h-[80px] rounded-full">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <p className="text-slate-400 mt-4 text-sm">Sign in to Employee Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-200 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login to Dashboard'}
          </button>

          <div className="text-center text-sm mt-4 space-y-2">
            <button
              type="button"
              onClick={onGoForgot}
              className="text-emerald-600 font-medium"
            >
              Forgot Password?
            </button>

            {/* <p>
              Don’t have an account?{' '}
              <button
                type="button"
                onClick={onGoSignup}
                className="text-emerald-600 font-semibold"
              >
                Sign Up
              </button>
            </p> */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
