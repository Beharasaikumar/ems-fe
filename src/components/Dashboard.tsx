import React, { useEffect, useMemo, useState } from 'react';
import { Employee, EmployeeAttendance } from '../types';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Download,
  Pin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { exportToCSV } from '../utils/utils';

type AttendanceRecord = { id: string; employeeId: string; date: string; status: string };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export const Dashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

   const current = new Date();
  const monthPrefix = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = current.toISOString().split('T')[0];

  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);


  useEffect(() => {
    loadData();
   }, []);

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any ?? {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed ${res.status}`);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return res.json();
    return res;
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [emps, atts, pinned] = await Promise.all([
        apiFetch('/employees') as Promise<Employee[]>,
        apiFetch(`/attendance?month=${monthPrefix}`) as Promise<AttendanceRecord[]>,
        apiFetch('/dailylogs?pinned=true') as Promise<any[]>
      ]);
      setEmployees(emps);
      setAttendance(atts);
      setPinnedNotes(pinned);
    } catch (err: any) {
      console.error('Dashboard load failed', err);
      setError(err?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalEmployees = employees.length;

     const todaysAttendanceIds = new Set<string>();
     let presentToday = 0;
     attendance.forEach(r => {
      if (r.date === todayStr){
        todaysAttendanceIds.add(r.employeeId);
        if( r.status === 'Present') presentToday++;
      }
    });

    const pendingActions = Math.max(0, totalEmployees - todaysAttendanceIds.size);

     const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      const key = e.department ?? 'Unknown';
      deptCounts[key] = (deptCounts[key] || 0) + 1;
    });

    const deptData = Object.keys(deptCounts).map(k => ({ name: k, value: deptCounts[k] }));

    return {
      totalEmployees,
      presentToday,
      attendanceRate: totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0,
      deptData,
      pendingActions
    };
  }, [employees, attendance, todayStr]);

   const handleExport = () => {
    const data = [
      { Metric: 'Total Employees', Value: stats.totalEmployees },
      { Metric: 'Present Today', Value: stats.presentToday },
      { Metric: 'Attendance Rate', Value: `${stats.attendanceRate}%` },
      { Metric: 'Pending Attendance', Value: stats.pendingActions },
      ...stats.deptData.map(d => ({ Metric: `Dept: ${d.name}`, Value: d.value }))
    ];
    exportToCSV(data, `Dashboard_Stats_${new Date().toISOString().split('T')[0]}.csv`);
  };

   const weeklyTrend = useMemo(() => {
    const now = new Date();
     const day = now.getDay(); 
    const diffToMonday = (day + 6) % 7; 
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const days: { dayLabel: string; date: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d.toISOString().split('T')[0] });
    }

     const data = days.map(d => {
      const count = attendance.filter(a => a.date === d.date && a.status === 'Present').length;
      return { day: d.dayLabel, count };
    });

    return data;
  }, [attendance]);

  const COLORS = ['#059669', '#10b981', '#34d399', '#6366f1', '#64748b'];

  if (loading) {
    return <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 text-red-600">
        Dashboard error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
        >
          <Download size={16} /> Export Overview
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.totalEmployees}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Present Today</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.presentToday}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.attendanceRate}%</h3>
          </div>
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Attendance</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.pendingActions}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

   

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Department Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
             {stats.deptData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[index % COLORS.length]}}></div>
                  <span className="text-sm text-slate-600">{entry.name} ({entry.value})</span>
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <div className="mb-6">
  <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
    <Pin size={18} /> Notifications
  </h4>

  {pinnedNotes.length === 0 ? (
    <p className="text-slate-400 text-sm">No notifications.</p>
  ) : (
    <div className="space-y-3 max-h-44 overflow-y-scroll pr-2">
      {pinnedNotes.map(note => (
        <div
          key={note.id}
          className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3"
        >
          <div className="w-2 h-2 mt-2 rounded-full bg-emerald-600"></div>

          <div className="flex-1">
            <p className="font-semibold text-emerald-800">
              {note.title}
            </p>

            <p className="text-sm text-slate-700">
              {note.content}
            </p>

            <p className="text-[11px] text-slate-500 mt-1">
              {new Date(note.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
          <div>
             <h4 className="text-lg font-bold text-slate-800 mb-6">Weekly Attendance Trend</h4>
           <div className="h-64 flex items-center justify-center text-slate-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
            </div> 

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
