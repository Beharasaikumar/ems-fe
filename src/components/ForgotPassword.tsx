import { useState } from 'react';
import { Mail } from 'lucide-react';

// 🔥 SAME-ORIGIN API (NGINX PROXY)
const API_BASE = '/api';

export default function ForgotPassword({
  onGoLogin,
}: {
  onGoLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email) {
      alert('Please enter your email');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      // Even if backend hides details, this must succeed
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      alert('If the email exists, a reset link has been sent.');

      setTimeout(() => {
        onGoLogin();
      }, 500);
    } catch (err) {
      console.error('Forgot password error:', err);
      alert('Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md">
        <div className="bg-slate-900 p-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="h-16 object-contain"
            />
          </div>
          <h2 className="text-white text-xl font-bold">
            Forgot Password
          </h2>
        </div>

        <div className="p-8 space-y-4">
          <div className="relative">
            <Mail
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full pl-10 py-2.5 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm">
            <button
              onClick={onGoLogin}
              className="text-emerald-600"
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

