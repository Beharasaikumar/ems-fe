import React, { useState } from 'react';
import { User, Mail, Lock, Leaf } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

export default function SignUp({ onGoLogin }: { onGoLogin: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    alert('Account created successfully');
    onGoLogin();
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border">
        <div className="bg-slate-900 p-8 text-center relative">
           <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-[200px] h-[80px] rounded-full">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
          <p className="text-slate-400 mt-2 text-sm">Join Lomaa Employee Portal</p>
        </div>

        <form onSubmit={submit} className="p-8 space-y-5">
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              placeholder="Username"
              required
              className="w-full pl-10 py-2.5 border rounded-lg"
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              placeholder="Email"
              required
              className="w-full pl-10 py-2.5 border rounded-lg"
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full pl-10 py-2.5 border rounded-lg"
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-lg">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <p className="text-center text-sm mt-3">
            Already have an account?{' '}
            <button type="button" onClick={onGoLogin} className="text-emerald-600 font-semibold">
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
