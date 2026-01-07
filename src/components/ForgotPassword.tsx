import { useState } from 'react';
import { Mail, Leaf } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export default function ForgotPassword({ onGoLogin }: { onGoLogin: () => void }) {
  const [email, setEmail] = useState('');

 async function submit() {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to send reset link');
    }

    alert('Reset link sent if account exists');
    onGoLogin();
  } catch (err: any) {
    alert(err?.message || 'Failed to send reset link');
  }
}


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md">
        <div className="bg-slate-900 p-8 text-center">
           <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-[200px] h-[80px] rounded-full">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <h2 className="text-white text-xl font-bold">Forgot Password</h2>
        </div>

        <div className="p-8 space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              placeholder="Enter your email"
              className="w-full pl-10 py-2.5 border rounded-lg"
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <button onClick={submit} className="w-full bg-emerald-600 text-white py-3 rounded-lg">
            Send Reset Link
          </button>

          <p className="text-center text-sm">
            <button onClick={onGoLogin} className="text-emerald-600">Back to Login</button>
          </p>
        </div>
      </div>
    </div>
  );
}
