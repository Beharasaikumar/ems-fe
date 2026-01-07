import React, { useEffect, useState } from 'react';
import {
  Calendar,
  FileText,
  Clock,
  Eye
} from 'lucide-react';
import { ViewState, Employee, Payslip, LeaveRequest } from '../types';
import { PayslipView } from './PayslipView';
import { EmployeeLeaves } from './EmployeeLeave';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';


async function authFetch(path: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}


interface EmployeePortalProps {
  currentView: ViewState;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ currentView }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  const loadLeaves = async () => {
  const lv = await authFetch('/leaves/me');
  setLeaves(Array.isArray(lv) ? lv : []);
};


  useEffect(() => {
    async function load() {
      try {
        const [emp, att, pay] = await Promise.all([
          authFetch('/employees/me'),
          authFetch('/attendance/me'),
          authFetch('/payroll/me')
        ]);

        setEmployee(emp);
        setAttendance(Array.isArray(att) ? att : []);
        setPayslips(Array.isArray(pay) ? pay : []);
        await loadLeaves();
      } catch (err) {
        console.error('Employee portal load failed', err);
        alert('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentView]);

  

  if (loading) return <div className="p-6">Loading...</div>;
  if (!employee) return <div className="p-6 text-red-600">Employee not found</div>;


  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const pendingPayslips = payslips.length === 0 ? 'Not yet generated' : payslips.length;


  
  const DashboardView = () => (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow">
        <h1 className="text-2xl font-bold">Welcome, {employee.name}</h1>
        <p className="text-slate-300">Employee ID: {employee.id}</p>
        <p className="text-slate-400 text-sm">{employee.email}</p>
      </div>

       {/* <div className="grid grid-cols-3 gap-4">
      <StatCard label="Sick Leave" value={employee.sickleave ?? 0} />
      <StatCard label="Casual Leave" value={employee.casualleave ?? 0} />
      <StatCard label="Paid Leave" value={employee.paidleave ?? 0} />
    </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Calendar />}
          label="Present Days"
          value={presentDays}
        />
        <StatCard
          icon={<FileText />}
          label="Payslips"
          value={pendingPayslips}
        />
        <StatCard
          icon={<Clock />}
          label="Status"
          value="Active"
          status='active'
        />
      </div>
    </div>
  );

  const AttendanceView = () => (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-bold mb-4 flex items-center gap-2">
        <Calendar /> My Attendance
      </h2>

      <div className="space-y-2 max-h-80 overflow-auto">
        {attendance.map(a => (
          <div
            key={a.id}
            className="flex justify-between border-b py-1 text-sm"
          >
            <span>{a.date}</span>
            <span
              className={`font-bold ${
                a.status === 'Present'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const PayslipsView = () => (
  <div className="bg-white rounded-xl shadow p-6">
    <h2 className="font-bold mb-4 flex items-center gap-2">
      <FileText /> My Payslips
    </h2>

    {payslips.length === 0 ? (
      <div className="text-center text-slate-500 py-10">
        No payslips generated yet
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payslips.map(p => (
          <div key={p.id} className="border rounded-xl p-4 shadow-sm bg-white">
            <h3 className="font-bold text-lg">{p.month}</h3>
            <p className="text-sm text-slate-500">Net Pay: ₹{p.netSalary}</p>

            <button
              onClick={() => setSelectedPayslip(p)}
              className="mt-3 inline-flex items-center gap-2 text-emerald-600 font-medium"
            >
              <Eye size={16} /> View Payslip
            </button>
          </div>
        ))}

        {selectedPayslip && (
          <PayslipView
            employee={employee}
            payslip={selectedPayslip}
            onClose={() => setSelectedPayslip(null)}
          />
        )}
      </div>
    )}
  </div>
);


 
  return (
    <div className="animate-fade-in">
      {currentView === 'DASHBOARD' && <DashboardView />}
      {currentView === 'ATTENDANCE' && <AttendanceView />}
      {currentView === 'PAYROLL' && <PayslipsView />}
      {currentView === 'LEAVES' && <EmployeeLeaves leaves={leaves} onCreated={loadLeaves}/>}
    </div>
  );
};

export default EmployeePortal;

function StatCard({
  icon,
  label,
  value,
  status,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  status?: 'active' | 'inactive';
  
}) {
  const statusBg =
    status === 'active'
      ? 'bg-green-100 border-green-300'
      : status === 'inactive'
      ? 'bg-red-100 border-red-300'
      : 'bg-white border-slate-200';

  const statusText =
    status === 'active'
      ? 'text-green-700'
      : status === 'inactive'
      ? 'text-red-700'
      : 'text-slate-700';

  return (
    <div className={`${statusBg} rounded-xl shadow p-6`}>
      <div className={`flex items-center gap-3 mb-2 ${statusText}`}>
        {icon && icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${statusText}`}>{value}</p>
    </div>
  );
}
