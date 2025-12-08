import React, { useEffect, useMemo, useState } from 'react';
import { Employee, Payslip } from '../types';
import { IndianRupee, Eye, CalendarClock, Search, Mail, X, Download, FileText, CalendarRange } from 'lucide-react';
import { PayslipView } from './PayslipView';
import { FilteredEmployeeSearch } from '../ui/FilteredEmployeeSearch';
import { exportToCSV } from '../utils/utils';
import { ExportRangeModal } from './ExportRangeModal';

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
  const [employeePayslips, setEmployeePayslips] = useState<Record<string, Payslip[]>>({});
  const [latestPayslips, setLatestPayslips] = useState<Payslip[]>([]);
  const [latestOpen, setLatestOpen] = useState(false);
  const [latestLoading, setLatestLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const today = new Date();
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

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
      await Promise.all(
        data.map(async (emp) => {
          try {
            const rows = await fetchPayslipHistory(emp.id);
            if (rows && rows.length > 0) {
              setGeneratedPayslips(prev => ({ ...prev, [emp.id]: rows[0] }));
            }
          } catch (e) {
            console.warn('Failed to load payslip for', emp.id, e);
          }
        })
      );
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

  async function fetchPayslipHistory(employeeId: string): Promise<Payslip[]> {
    try {
      const rows = await apiFetch(`/payroll/employee/${employeeId}`) as any[];
      const parsed: Payslip[] = rows.map(r => {
        if (r.data && typeof r.data === 'object') {
          return r.data as Payslip;
        }
        if (r.data && typeof r.data === 'string') {
          try { return JSON.parse(r.data) as Payslip; } catch { return r as Payslip; }
        }
        return (r as unknown) as Payslip;
      });
      setEmployeePayslips(prev => ({ ...prev, [employeeId]: parsed }));
      return parsed;
    } catch (err) {
      console.error('Failed to load payslip history', err);
      setEmployeePayslips(prev => ({ ...prev, [employeeId]: [] }));
      return [];
    }
  }

  async function generatePayslip(emp: Employee) {
    setLoadingId(emp.id);
    try {
      const payload = {};
      const result = await apiFetch(`/payroll/generate/${emp.id}`, { method: 'POST', body: JSON.stringify(payload) }) as Payslip;
      setGeneratedPayslips(prev => ({ ...prev, [emp.id]: result }));
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
      const token = getToken();
      const resp = await fetch(`${API_BASE}/payroll/pdf-html/${payslip.id}`, {
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
      await apiFetch(`/payroll/email-html/${payslip.id}`, { method: 'POST', body: JSON.stringify({ to: recipient }) });
      alert('Email request sent.');
    } catch (err: any) {
      console.error('Email failed', err);
      alert('Failed to send email: ' + (err?.message ?? ''));
    }
  }

  async function fetchLatestPayslips() {
    setLatestLoading(true);
    try {
      const rows = await apiFetch('/payroll/latest') as any[];
      const parsed: Payslip[] = rows.map(r => {
        if (typeof r === 'object') return r as Payslip;
        try { return JSON.parse(r) as Payslip; } catch { return r as Payslip; }
      });
      setLatestPayslips(parsed);
      setLatestOpen(true);
    } catch (err) {
      console.error('Failed to fetch latest payslips', err);
      alert('Failed to fetch latest payslips: ' + (err?.message ?? ''));
    } finally {
      setLatestLoading(false);
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

  function resolveEmployeeForPayslip(slip: Payslip): Employee | undefined {
    const possibleIds = [
      (slip as any).employeeId,
      (slip as any).empId,
      (slip as any).employee?.id,
      (slip as any).userId,
      slip.id
    ].filter(Boolean) as string[];

    if (possibleIds.length > 0) {
      for (const id of possibleIds) {
        const e = employees.find(x => x.id === id);
        if (e) return e;
      }
    }

    const name = (slip as any).employeeName || (slip as any).name || (slip as any).empName;
    if (name) {
      const e = employees.find(x => x.name === name);
      if (e) return e;
      return { id: (slip as any).employeeId ?? (slip as any).empId ?? 'unknown', name } as Employee;
    }

    return undefined;
  }

   const handleExport = () => {
    const data = filteredEmployees.map(emp => {
      const slip = generatedPayslips[emp.id];
      const fixedGross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.da ?? 0) + (emp.specialAllowance ?? 0);
      return {
        EmployeeID: emp.id,
        Name: emp.name,
        Department: emp.department,
        FixedBasic: emp.basicSalary,
        FixedGross: fixedGross,
        Generated: slip ? 'Yes' : 'No',
        PaidDays: slip ? Math.round((slip.attendancePercentage / 100) * 30) : '-',
        EarnedBasic: slip ? slip.earnings.basic : '-',
        EarnedGross: slip ? slip.earnings.gross : '-',
        TotalDeductions: slip ? slip.deductions.totalDeductions : '-',
        NetPayable: slip ? slip.netSalary : '-'
      };
    });
    exportToCSV(data, `Payroll_Summary_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportMonthlyReport = () => {
    const data = filteredEmployees.map(emp => {
      const slip = generatedPayslips[emp.id];
      
      const baseInfo = {
        'Employee ID': emp.id,
        'Name': emp.name,
        'Department': emp.department,
        'Bank Account': emp.bankAccountNumber || 'N/A',
        'PAN': emp.pan || 'N/A',
      };

      if (!slip) {
         return {
           ...baseInfo,
           'Status': 'Pending Generation',
           'Days Paid': '-',
           'Basic': '-',
           'HRA': '-',
           'DA': '-',
           'Special Allow.': '-',
           'GROSS EARNINGS': '-',
           'PF': '-',
           'ESI': '-',
           'Prof. Tax': '-',
           'TDS': '-',
           'TOTAL DEDUCTIONS': '-',
           'NET PAYABLE': '-'
         };
      }

      return {
        ...baseInfo,
        'Status': 'Generated',
        'Days Paid': Math.round((slip.attendancePercentage / 100) * 30),
        'Basic': slip.earnings.basic,
        'HRA': slip.earnings.hra,
        'DA': slip.earnings.da,
        'Special Allow.': slip.earnings.specialAllowance,
        'GROSS EARNINGS': slip.earnings.gross,
        'PF': slip.deductions.pf,
        'ESI': slip.deductions.esi,
        'Prof. Tax': slip.deductions.pt,
        'TDS': slip.deductions.tax,
        'TOTAL DEDUCTIONS': slip.deductions.totalDeductions,
        'NET PAYABLE': slip.netSalary
      };
    });
    exportToCSV(data, `Monthly_Payroll_Report_${new Date().toISOString().slice(0, 7)}.csv`);
  };

  const handleRangeExport = (startMonth: string, endMonth: string) => {
    // Input format YYYY-MM
    let current = new Date(startMonth + '-01'); // Force 1st of month
    const end = new Date(endMonth + '-01');
    const allData: any[] = [];

    // Loop through months
    while (current <= end) {
      const year = current.getFullYear();
      const monthIndex = current.getMonth();
      const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      
      filteredEmployees.forEach(emp => {
         // Reuse existing payroll calc approach by attempting to derive paidDays from existing payslips if present,
         // otherwise approximate using employeePayslips history or attendance (maintaining original logic unchanged).
         // For compatibility with prior version, if a generated payslip exists for that emp & month, use it; else fallback:
         const existingSlip = (employeePayslips[emp.id] || []).find(s => s.month === monthStr) || (generatedPayslips[emp.id] && generatedPayslips[emp.id].month === monthStr ? generatedPayslips[emp.id] : undefined);
         
         if (existingSlip) {
           const result = {
             paidDays: Math.round((existingSlip.attendancePercentage / 100) * 30),
             earnings: existingSlip.earnings,
             deductions: existingSlip.deductions,
             netSalary: existingSlip.netSalary
           };
           allData.push({
             'Month': monthStr,
             'Employee ID': emp.id,
             'Name': emp.name,
             'Department': emp.department,
             'Days Paid': result.paidDays,
             'Basic': result.earnings.basic,
             'HRA': result.earnings.hra,
             'DA': result.earnings.da,
             'Special': result.earnings.specialAllowance,
             'GROSS': result.earnings.gross,
             'PF': result.deductions.pf,
             'ESI': result.deductions.esi,
             'PT': result.deductions.pt,
             'TDS': result.deductions.tax,
             'DEDUCTIONS': result.deductions.totalDeductions,
             'NET SALARY': result.netSalary
           });
         } else {
           // Fallback: try to approximate using attendance records for that month
           const monthPrefixLocal = monthStr;
           const monthRecords = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(monthPrefixLocal));
           let paidDays = 0;
           const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
           if (monthRecords.length === 0) {
             paidDays = totalDaysInMonth;
           } else {
             monthRecords.forEach(r => {
               if (r.status === 'Present') paidDays += 1;
               if (r.status === 'Leave') paidDays += 1;
               if (r.status === 'Half Day') paidDays += 0.5;
             });
           }
           const basic = Math.round(((emp.basicSalary ?? 0) / totalDaysInMonth) * paidDays);
           const hra = Math.round(((emp.hra ?? 0) / totalDaysInMonth) * paidDays);
           const da = Math.round(((emp.da ?? 0) / totalDaysInMonth) * paidDays);
           const special = Math.round(((emp.specialAllowance ?? 0) / totalDaysInMonth) * paidDays);
           const gross = basic + hra + da + special;
           // approximate deductions similar to previous logic (simple heuristic)
           const pf = Math.round(basic * 0.12);
           const esi = gross < 21000 ? Math.ceil(gross * 0.0075) : 0;
           const pt = 200;
           const tax = gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0;
           const totalDeductions = pf + esi + pt + tax;
           const netSalary = gross - totalDeductions;

           allData.push({
             'Month': monthStr,
             'Employee ID': emp.id,
             'Name': emp.name,
             'Department': emp.department,
             'Days Paid': paidDays,
             'Basic': basic,
             'HRA': hra,
             'DA': da,
             'Special': special,
             'GROSS': gross,
             'PF': pf,
             'ESI': esi,
             'PT': pt,
             'TDS': tax,
             'DEDUCTIONS': totalDeductions,
             'NET SALARY': netSalary
           });
         }
      });

      // Next month
      current.setMonth(current.getMonth() + 1);
    }

    exportToCSV(allData, `Payroll_Register_${startMonth}_to_${endMonth}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 truncate">
            <IndianRupee className="text-emerald-600" /> <span>Payroll Management</span>
          </h2>
          <p className="text-slate-500 sm:max-w-auto mt-1 text-sm truncate">Generate monthly payslips based on actual attendance.</p>
        </div>

        <div className="w-full md:w-[40%] lg:w-[35%]">
          <FilteredEmployeeSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showSecondary
            secondaryLabel="View all payslips"
            onSecondaryClick={fetchLatestPayslips}
            secondaryLoading={latestLoading}
            inputWidthClass="w-full flex-1"
            placeholder="Search employee..."
          />
        </div>
         <div className="flex flex-col md:flex-row gap-2 w-full sm:w-auto ">
          <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
          >
              <Download size={16} /> Summary
          </button>
          <button 
              onClick={handleExportMonthlyReport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
          >
              <FileText size={16} /> Monthly
          </button>
          <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
          >
              <CalendarRange size={16} /> Range
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 md:p-6 bg-white rounded-xl shadow-sm border border-slate-100">Loading…</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center p-8 md:p-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
          No employees found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredEmployees.map(emp => {
            const slip = generatedPayslips[emp.id];
            const isLoading = loadingId === emp.id;
            const history = employeePayslips[emp.id] ?? [];

            const fixedGross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.da ?? 0) + (emp.specialAllowance ?? 0);

            return (
              <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-4 md:p-6 flex  items-start justify-between border-b border-slate-50 gap-4">
                  <div className="flex gap-3 items-start min-w-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0">
                      {emp.name ? emp.name.charAt(0) : emp.id}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{emp.name}</h3>
                      <p className="text-sm text-slate-500 truncate">{emp.role}</p>
                      <div className="text-xs text-slate-500 mt-1 hidden sm:block">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs border border-slate-200">{emp.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={async () => {
                        if (!employeePayslips[emp.id]) await fetchPayslipHistory(emp.id);
                        const rows = employeePayslips[emp.id] || [];
                        if (rows.length > 0) {
                          viewPayslip(emp, rows[0]);
                        } else if (generatedPayslips[emp.id]) {
                          viewPayslip(emp, generatedPayslips[emp.id]);
                        } else {
                          alert('No payslip available. Generate first.');
                        }
                      }}
                      className="text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100 whitespace-nowrap"
                      title="View latest payslip / history"
                    >
                      View History
                    </button>

                    <button
                      onClick={async () => {
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

                <div className="p-4 md:p-6 bg-slate-50/50 flex-1 space-y-3">
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

                <div className="p-3 md:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      if (slip) viewPayslip(emp, slip);
                      else {
                        const rows = employeePayslips[emp.id] ?? [];
                        if (rows.length > 0) viewPayslip(emp, rows[0]);
                        else alert('No payslip to view. Generate one.');
                      }
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> <span className="hidden sm:inline">View</span>
                    <span className="sm:hidden">View</span>
                  </button>

                  <button
                    onClick={async () => {
                      const rows = employeePayslips[emp.id] ?? [];
                      const target = rows[0] ?? generatedPayslips[emp.id];
                      if (!target) return alert('Generate payslip first.');
                      await downloadPdf(target);
                    }}
                    className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
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
                    className="w-full sm:w-auto py-2.5 px-4 bg-white border border-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail size={16} /> <span className="hidden sm:inline">Email</span>
                    <span className="sm:hidden">Email</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {latestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLatestOpen(false)} />
          <div className="relative w-full max-w-3xl mx-2 md:mx-4 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Latest payslips (one per employee)</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // refresh
                    fetchLatestPayslips();
                  }}
                  className="text-sm px-3 py-1 rounded-md bg-slate-50 border border-slate-100"
                >
                  Refresh
                </button>
                <button className="p-2" onClick={() => setLatestOpen(false)}><X /></button>
              </div>
            </div>

            <div className="p-4 max-h-[60vh] overflow-auto">
              {latestPayslips.length === 0 ? (
                <div className="text-center text-slate-500 p-6">No payslips returned.</div>
              ) : (
                <div className="space-y-3">
                  {latestPayslips.map((slip) => {
                    const resolved = resolveEmployeeForPayslip(slip);
                    const empForView = resolved ?? { id: (slip as any).employeeId ?? (slip as any).empId ?? 'unknown', name: (slip as any).employeeName ?? 'Unknown' } as Employee;

                    const gd = (slip as any).generatedDate ? new Date((slip as any).generatedDate) : undefined;
                    const genDateStr = gd ? gd.toLocaleString() : (slip as any).generatedDate ?? '—';

                    return (
                      <div key={slip.id ?? Math.random()} className="p-3 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{empForView.name}</div>
                          <div className="text-xs text-slate-500">Payslip ID: {slip.id ?? '—'}</div>
                          <div className="text-xs text-slate-500">Generated: {genDateStr}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const emp = resolved ?? { id: (slip as any).employeeId ?? (slip as any).empId ?? 'unknown', name: (slip as any).employeeName ?? 'Unknown' } as Employee;
                              setLatestOpen(false);
                              setSelectedPayslip({ emp, slip });
                            }}
                            className="py-2 px-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md text-sm"
                          >
                            View
                          </button>

                          <button
                            onClick={async () => {
                              await downloadPdf(slip);
                            }}
                            className="py-2 px-3 bg-white border border-slate-100 rounded-md text-sm"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPayslip && (
        <PayslipView
          employee={selectedPayslip.emp}
          payslip={selectedPayslip.slip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
       <ExportRangeModal 
         isOpen={showExportModal}
         onClose={() => setShowExportModal(false)}
         onExport={handleRangeExport}
         type="month"
         title="Export Payroll Register"
      />
    </div>
  );
};

export default PayrollManager;
