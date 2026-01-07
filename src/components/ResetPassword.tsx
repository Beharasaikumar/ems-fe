import { useState } from 'react';
import { Lock, Leaf } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export default function ResetPassword({ token, onGoLogin }: { token: string; onGoLogin: () => void }) {
  const [password, setPassword] = useState('');

 async function submit() {
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Reset failed');
    }

    alert('Password reset successful');
    onGoLogin();
  } catch (err: any) {
    alert(err?.message || 'Password reset failed');
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
          <h2 className="text-white text-xl font-bold">Reset Password</h2>
        </div>

        <div className="p-8 space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="password"
              placeholder="New Password"
              className="w-full pl-10 py-2.5 border rounded-lg"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button onClick={submit} className="w-full bg-emerald-600 text-white py-3 rounded-lg">
            Reset Password
          </button>

          <p className="text-center text-sm">
            <button onClick={onGoLogin} className="text-emerald-600">Back to Login</button>
          </p>
        </div>
      </div>
    </div>
  );
}
