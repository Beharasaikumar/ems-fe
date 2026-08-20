import React, { useState } from 'react';
import { LeaveRequest } from '../types';
import { Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

async function authPost(path: string, body: any) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

interface Props {
  leaves: LeaveRequest[];
  onCreated: () => void;
}

export const EmployeeLeaves: React.FC<Props> = ({
  leaves = [],
  onCreated,
}) => {
  const [type, setType] = useState<'Sick' | 'Casual' | 'Paid'>('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!startDate || !endDate) {
      alert('Please select dates');
      return;
    }

    try {
      setLoading(true);
      await authPost('/leaves', {
        type,
        startDate,
        endDate,
        reason,
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      onCreated(); // 🔄 refresh history
    } 
    // catch {
    //   alert('Failed to submit leave');
    // } 
    finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Request Leave */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Calendar /> Request Leave
        </h2>

        <label className="text-sm font-medium">Leave Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value as any)}
          className="w-full border rounded p-2 mt-1 mb-3"
        >
          <option value="Casual">Casual Leave</option>
          <option value="Sick">Sick Leave</option>
          <option value="Paid">Paid Leave</option>
        </select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded p-2"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <textarea
          placeholder="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold mb-4">Request History</h2>

        {leaves.length === 0 ? (
          <p className="text-slate-400">No leave requests found.</p>
        ) : (
          <div className="space-y-3">
            {leaves.map(l => (
              <div key={l.id} className="border p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">{l.type}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    l.status === 'Approved'
                      ? 'bg-green-100 text-green-700'
                      : l.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {l.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {l.startDate} → {l.endDate}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
