import React, { useEffect, useMemo, useState } from 'react';
import { Employee, EmployeeAttendance, Payslip } from '../types';
import { IndianRupee, Sparkles, Eye, Loader2, CalendarClock, Search, Mail } from 'lucide-react';
import { PayslipView } from './PayslipView';

type AttendanceRecord = { id: string; employeeId: string; date: string; status: string };

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export const PayrollManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [generatedPayslips, setGeneratedPayslips] = useState<Record<string, Payslip>>({});
  const [selectedPayslip, setSelectedPayslip] = useState<{ emp: Employee; slip: Payslip } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeePayslips, setEmployeePayslips] = useState<Record<string, Payslip[]>>({}); // history cache

  const today = new Date();
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

  useEffect(() => {
    loadEmployees();
    loadAttendanceForMonth(monthPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await apiFetch('/employees') as Employee[];
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees', err);
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceForMonth(month: string) {
    try {
      const data = await apiFetch(`/attendance?month=${month}`) as AttendanceRecord[];
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance', err);
    }
  }

  async function fetchPayslipHistory(employeeId: string) {
    try {
      const rows = await apiFetch(`/payroll/employee/${employeeId}`) as any[]; // each has data string
      // Normalise: if server returned persisted payslips with data JSON string, handle that
      const parsed: Payslip[] = rows.map(r => {
        if (r.data && typeof r.data === 'string') {
          try { return JSON.parse(r.data) as Payslip; } catch { return r as Payslip; }
        }
        return (r as unknown) as Payslip;
      });
      setEmployeePayslips(prev => ({ ...prev, [employeeId]: parsed }));
      return parsed;
    } catch (err) {
      console.error('Failed to load payslip history', err);
      return [];
    }
  }

  async function generatePayslip(emp: Employee) {
    setLoadingId(emp.id);
    try {
      // call backend to generate and persist payslip
      const payload = {}; // backend uses current month if not provided
      const result = await apiFetch(`/payroll/generate/${emp.id}`, { method: 'POST', body: JSON.stringify(payload) }) as Payslip;
      // server returns computed payload (matching earlier server code)
      setGeneratedPayslips(prev => ({ ...prev, [emp.id]: result }));
      // update history cache: prepend newest
      setEmployeePayslips(prev => ({ ...prev, [emp.id]: [result, ...(prev[emp.id] || [])] }));
    } catch (err: any) {
      console.error('Generate failed', err);
      alert('Payslip generation failed: ' + (err?.message ?? ''));
    } finally {
      setLoadingId(null);
    }
  }

  async function downloadPdf(payslip: Payslip) {
    try {
      // Backend expects POST /payroll/pdf/:payslipId returning PDF bytes
      const token = getToken();
      const resp = await fetch(`${API_BASE}/payroll/pdf/${payslip.id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `PDF generation failed (${resp.status})`);
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslip.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download PDF failed', err);
      alert('Failed to download PDF: ' + (err?.message ?? ''));
    }
  }

async function emailPayslip(payslip: Payslip, to?: string) {
  try {
    const recipient = to ?? prompt('Send payslip to (email):', '');
    if (!recipient) return;
    await apiFetch(`/payroll/email/${payslip.id}`, { method: 'POST', body: JSON.stringify({ to: recipient }) });
    alert('Email request sent (if SMTP configured).');
  } catch (err: any) {
    console.error('Email failed', err);
    alert('Failed to send email: ' + (err?.message ?? ''));
  }
}


  const filteredEmployees = useMemo(() => employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [employees, searchTerm]);

  const viewPayslip = (emp: Employee, slip: Payslip) => {
    setSelectedPayslip({ emp, slip });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IndianRupee className="text-emerald-600" /> Payroll Management
          </h2>
          <p className="text-slate-500 mt-1 text-sm">Generate monthly payslips based on actual attendance.</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">Loading…</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center p-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
          No employees found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => {
            const slip = generatedPayslips[emp.id];
            const isLoading = loadingId === emp.id;
            const history = employeePayslips[emp.id] ?? [];

            const fixedGross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.da ?? 0) + (emp.specialAllowance ?? 0);

            return (
              <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-6 flex items-start justify-between border-b border-slate-50">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {emp.name ? emp.name.charAt(0) : emp.id}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{emp.name}</h3>
                      <p className="text-sm text-slate-500">{emp.role}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={async () => {
                        // load history if not loaded
                        if (!employeePayslips[emp.id]) await fetchPayslipHistory(emp.id);
                        const rows = employeePayslips[emp.id] || [];
                        if (rows.length > 0) {
                          // view latest
                          viewPayslip(emp, rows[0]);
                        } else if (generatedPayslips[emp.id]) {
                          viewPayslip(emp, generatedPayslips[emp.id]);
                        } else {
                          alert('No payslip available. Generate first.');
                        }
                      }}
                      className="text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100"
                      title="View latest payslip / history"
                    >
                      View History
                    </button>

                    <button
                      onClick={async () => {
                        // quick generate & then fetch history
                        await generatePayslip(emp);
                        await fetchPayslipHistory(emp.id);
                      }}
                      disabled={isLoading}
                      className="text-xs px-3 py-1 rounded-md bg-slate-50 border border-slate-100"
                    >
                      {isLoading ? 'Processing...' : 'Generate'}
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 flex-1 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Fixed Basic</span>
                    <span className="font-medium text-slate-700">₹{(emp.basicSalary ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Fixed Gross</span>
                    <span className="font-medium text-slate-700">₹{fixedGross.toLocaleString()}</span>
                  </div>

                  {slip && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <div className="flex justify-between text-sm font-semibold text-emerald-700">
                        <span>Net Payable</span>
                        <span>₹{slip.netSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <CalendarClock size={12} />
                        <span>Based on {Math.round((slip.attendancePercentage / 100) * 30)} days present</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
                  <button
                    onClick={() => {
                      if (slip) viewPayslip(emp, slip);
                      else {
                        // open latest history if exists
                        const rows = employeePayslips[emp.id] ?? [];
                        if (rows.length > 0) viewPayslip(emp, rows[0]);
                        else alert('No payslip to view. Generate one.');
                      }
                    }}
                    className="flex-1 py-2.5 px-4 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> View
                  </button>

                  <button
                    onClick={async () => {
                      // prefer latest from history, then generated payslip
                      const rows = employeePayslips[emp.id] ?? [];
                      const target = rows[0] ?? generatedPayslips[emp.id];
                      if (!target) return alert('Generate payslip first.');
                      await downloadPdf(target);
                    }}
                    className="py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    Download PDF
                  </button>

                  <button
                    onClick={async () => {
                      const rows = employeePayslips[emp.id] ?? [];
                      const target = rows[0] ?? generatedPayslips[emp.id];
                      if (!target) return alert('Generate payslip first.');
                      const to = emp.email ?? prompt('Employee email:', '') ?? '';
                      if (!to) return alert('No email provided');
                      await emailPayslip(target, to);
                    }}
                    className="py-2.5 px-4 bg-white border border-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Mail size={16} /> Email
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPayslip && (
        <PayslipView
          employee={selectedPayslip.emp}
          payslip={selectedPayslip.slip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
};

export default PayrollManager;
