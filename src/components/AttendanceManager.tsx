import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock, AlertTriangle, Search } from 'lucide-react';
import { Employee, AttendanceStatus } from '../types';

type AttendanceRecord = { id: string; employeeId: string; date: string; status: string };

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

function getToken(): string | null {
  return localStorage.getItem('lomaa_token');
}

export const AttendanceManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({}); 

  const dateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);
  const monthPrefix = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; 
  }, [selectedDate]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadAttendanceForMonth(monthPrefix);
  }, [monthPrefix]);

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any ?? {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) {
      
      localStorage.removeItem('lomaa_token');
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed ${res.status}`);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return await res.json();
    return res;
  }

  async function loadEmployees() {
    try {
      setLoading(true);
      const data = await apiFetch('/employees') as Employee[];
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees', err);
    
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceForMonth(month: string) {
    try {
      setLoading(true);
      const data = await apiFetch(`/attendance?month=${month}`) as AttendanceRecord[];
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatus = (empId: string, date: string) => {
    const rec = attendance.find(a => a.employeeId === empId && a.date === date);
    return rec ? (rec.status as AttendanceStatus) : null;
  };

  const shiftDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.role ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function onUpdateAttendance(empId: string, date: string, status: AttendanceStatus) {
     setSaving(prev => ({ ...prev, [empId]: true }));
    try {
       const payload = { employeeId: empId, date, status };
      const result = await apiFetch('/attendance', { method: 'POST', body: JSON.stringify(payload) }) as AttendanceRecord;

       setAttendance(prev => {
        const idx = prev.findIndex(r => r.employeeId === result.employeeId && r.date === result.date);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = result;
          return copy;
        } else {
          return [...prev, result];
        }
      });
    } catch (err) {
      console.error('Failed to update attendance', err);
      alert('Failed to update attendance: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(prev => ({ ...prev, [empId]: false }));
    }
  }

  const statusColors: Record<AttendanceStatus, string> = {
    [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-700 border-green-200',
    [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-700 border-red-200',
    [AttendanceStatus.HALF_DAY]: 'bg-amber-100 text-amber-700 border-amber-200',
    [AttendanceStatus.LEAVE]: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-emerald-600" />
          Daily Attendance
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full sm:w-auto justify-between">
            <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white hover:shadow rounded-md transition-all text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-slate-700 min-w-[120px] text-center">
              {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white hover:shadow rounded-md transition-all text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">Employee</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Role</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const currentStatus = getStatus(emp.id, dateStr);

                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {emp.name ? emp.name.split(' ').map(n => n[0]).join('') : emp.id}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{emp.role}</td>
                    <td className="p-4">
                      {currentStatus ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[currentStatus]}`}>
                          {currentStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not Marked</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onUpdateAttendance(emp.id, dateStr, AttendanceStatus.PRESENT)}
                          title="Present"
                          disabled={!!saving[emp.id]}
                          className={`p-2 rounded-lg transition-colors ${currentStatus === AttendanceStatus.PRESENT ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => onUpdateAttendance(emp.id, dateStr, AttendanceStatus.ABSENT)}
                          title="Absent"
                          disabled={!!saving[emp.id]}
                          className={`p-2 rounded-lg transition-colors ${currentStatus === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => onUpdateAttendance(emp.id, dateStr, AttendanceStatus.HALF_DAY)}
                          title="Half Day"
                          disabled={!!saving[emp.id]}
                          className={`p-2 rounded-lg transition-colors ${currentStatus === AttendanceStatus.HALF_DAY ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
                        >
                          <Clock size={18} />
                        </button>
                        <button
                          onClick={() => onUpdateAttendance(emp.id, dateStr, AttendanceStatus.LEAVE)}
                          title="Leave"
                          disabled={!!saving[emp.id]}
                          className={`p-2 rounded-lg transition-colors ${currentStatus === AttendanceStatus.LEAVE ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                        >
                          <AlertTriangle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading...' : 'No employees match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
