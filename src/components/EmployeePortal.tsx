import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  FileText,
  Clock,
  Eye,
  Award,
  Table as TableIcon,
  CheckCircle2
} from 'lucide-react';
import { ViewState, Employee, Payslip, LeaveRequest } from '../types';
import { PayslipView } from './PayslipView';
import { EmployeeLeaves } from './EmployeeLeave';
import { AnnualDocumentModal } from './AnnualDocumentModal';
import { currentFYStartYear, getFinancialYearOptions, calculateFixedMonthly, formatINR } from '../utils/annualPayroll';

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
  const [payslipTab, setPayslipTab] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [fyStartYear, setFyStartYear] = useState<number>(currentFYStartYear());
  const [annualDocView, setAnnualDocView] = useState<'certificate' | 'statement' | null>(null);

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

  const fyOptions = getFinancialYearOptions([employee]);
  const fixedMonthly = calculateFixedMonthly(employee);
  const annualGrossCTC = fixedMonthly.earnings.gross * 12;
  const annualNetDisbursed = fixedMonthly.netSalary * 12;
  const annualPF = fixedMonthly.deductions.pf * 12;
  const annualStatutory = (fixedMonthly.deductions.pf + fixedMonthly.deductions.esi + fixedMonthly.deductions.pt + fixedMonthly.deductions.tax) * 12;


  
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText /> My Salary &amp; Compensation Documents
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Access monthly salary slips and official Annual Salary Certificates for tax filing and loan verification.
          </p>
        </div>

        <div className="flex bg-slate-100 rounded-lg border border-slate-200 p-1 shrink-0">
          <button
            onClick={() => setPayslipTab('MONTHLY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${payslipTab === 'MONTHLY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={14} /> Monthly Slips
          </button>
          <button
            onClick={() => setPayslipTab('ANNUAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${payslipTab === 'ANNUAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Award size={14} /> Annual Certificate &amp; Statement
          </button>
        </div>
      </div>

      {payslipTab === 'MONTHLY' && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Generated Monthly Payslips</h3>
            <span className="text-xs text-slate-400">{payslips.length} Total Slips</span>
          </div>

          {payslips.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              No payslips generated yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payslips.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4 shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pay Period</p>
                      <h3 className="font-bold text-lg text-slate-800">{p.month}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">PAID</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1 text-sm">
                    <span className="text-slate-500">Take-Home Pay</span>
                    <span className="font-bold text-slate-800">{formatINR(p.netSalary)}</span>
                  </div>

                  <button
                    onClick={() => setSelectedPayslip(p)}
                    className="mt-3 w-full py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye size={16} /> View &amp; Download Slip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {payslipTab === 'ANNUAL' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Award className="text-emerald-600" size={18} /> Annual Salary Statement &amp; Certificate
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Official proof of remuneration for income tax assessment (ITR) and bank loan verification.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm text-sm font-medium">
              <div className="text-center leading-tight">
                <div className="text-xs text-slate-400 uppercase">Financial Year</div>
                <select
                  value={fyStartYear}
                  onChange={(e) => setFyStartYear(Number(e.target.value))}
                  className="font-semibold outline-none bg-transparent cursor-pointer"
                >
                  {fyOptions.map(opt => (
                    <option key={opt.startYear} value={opt.startYear}>
                      {opt.label}{opt.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Gross CTC (FY {fyStartYear}-{fyStartYear + 1})</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatINR(annualGrossCTC)}</p>
              <p className="text-xs text-slate-400 mt-1">{formatINR(fixedMonthly.earnings.gross)} / month</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Annual Net Disbursed</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatINR(annualNetDisbursed)}</p>
              <p className="text-xs text-slate-400 mt-1">Direct Take-Home Pay</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Annual PF Contribution</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">{formatINR(annualPF)}</p>
              <p className="text-xs text-slate-400 mt-1 truncate">UAN: {employee.pfAccountNumber || 'N/A'}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Statutory Deductions</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{formatINR(annualStatutory)}</p>
              <p className="text-xs text-slate-400 mt-1">PF + ESI + PT + TDS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 size={13} /> Official Certificate
                </span>
                <h4 className="font-bold text-lg mt-2">Annual Salary Certificate</h4>
                {/* <p className="text-slate-400 text-sm mt-2">
                  Official letter signed by HR with corporate seal certifying your employment role, annual compensation structure, and salary for FY {fyStartYear}-{fyStartYear + 1}.
                </p> */}
              </div>
              <button
                onClick={() => setAnnualDocView('certificate')}
                className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 text-sm"
              >
                <Award size={16} /> View &amp; Download Certificate
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableIcon size={13} /> Detailed Ledger
                </span>
                <h4 className="font-bold text-lg mt-2 text-slate-800">12-Month Salary Statement</h4>
                {/* <p className="text-slate-500 text-sm mt-2">
                  Month-by-month financial statement breaking down gross earnings, paid days, provident fund, taxes, and net disbursements across all 12 months.
                </p> */}
              </div>
              <button
                onClick={() => setAnnualDocView('statement')}
                className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 text-sm"
              >
                <TableIcon size={16} /> View 12-Month Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayslip && (
        <PayslipView
          employee={employee}
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {annualDocView && (
        <AnnualDocumentModal
          employee={employee}
          fyOptions={fyOptions}
          initialFYStartYear={fyStartYear}
          initialView={annualDocView}
          attendanceRecords={attendance}
          payslipHistory={payslips}
          onClose={() => setAnnualDocView(null)}
        />
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
