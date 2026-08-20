import React, { useEffect, useMemo, useState } from 'react';
import { Employee, Payslip } from '../types';
import { IndianRupee, Eye, CalendarClock, Search, Mail, X, Download, FileText, CalendarRange, ChevronLeft, ChevronRight, Award, Table as TableIcon, FileSignature, RotateCw, Loader2, Sparkles } from 'lucide-react';
import { PayslipView } from './PayslipView';
import { exportToCSV } from '../utils/utils';
import { ExportRangeModal } from './ExportRangeModal';
import { AnnualDocumentModal } from './AnnualDocumentModal';
import {
  currentFYStartYear,
  getFinancialYearOptions,
  calculateFixedMonthly,
} from '../utils/annualPayroll';

type AttendanceRecord = { id: string; employeeId: string; date: string; status: string };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';
const PAGE_SIZE = 8;

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export const PayrollManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [generatedPayslips, setGeneratedPayslips] = useState<Record<string, Record<string, Payslip>>>({});
  const [selectedPayslip, setSelectedPayslip] = useState<{ emp: Employee; slip: Payslip } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeePayslips, setEmployeePayslips] = useState<Record<string, Payslip[]>>({});
  const [latestPayslips, setLatestPayslips] = useState<Payslip[]>([]);
  const [latestOpen, setLatestOpen] = useState(false);
  const [latestLoading, setLatestLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(new Date());
  const [advanceInput, setAdvanceInput] = useState<Record<string, number | ''>>({});

  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [fyStartYear, setFyStartYear] = useState<number>(currentFYStartYear());
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendanceLoaded, setAllAttendanceLoaded] = useState(false);
  const [annualDoc, setAnnualDoc] = useState<{ emp: Employee; view: 'certificate' | 'statement' } | null>(null);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [yearlyPage, setYearlyPage] = useState(1);


  const formatPeriodLabel = (d: Date) =>
    d.toLocaleString('default', { month: 'short', year: 'numeric' });

  const getPeriodPrefix = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const shiftPeriod = (months: number) => {
    const newDate = new Date(selectedPeriod);
    newDate.setMonth(newDate.getMonth() + months);
    setSelectedPeriod(newDate);
  };

  useEffect(() => {
    loadEmployees();
    loadAttendanceForMonth(getPeriodPrefix(selectedPeriod));
  }, []);

  useEffect(() => {
    loadAttendanceForMonth(getPeriodPrefix(selectedPeriod));
  }, [selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'YEARLY' && !allAttendanceLoaded) {
      apiFetch('/attendance')
        .then((rows: AttendanceRecord[]) => {
          setAllAttendance(rows);
          setAllAttendanceLoaded(true);
        })
        .catch(err => console.error('Failed to load full attendance history', err));
    }
  }, [activeTab, allAttendanceLoaded]);

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
              setGeneratedPayslips(prev => {
                const updated = { ...(prev[emp.id] ?? {}) };

                rows.forEach(r => {
                  updated[r.month] = r;
                });

                return { ...prev, [emp.id]: updated };
              });
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
          try {
            return JSON.parse(r.data) as Payslip;

          } catch {
            return r as Payslip;
          }
        }
        return (r as unknown) as Payslip;
      });
      parsed.forEach(p => {
        (p as any).generatedDateNormalized = (p as any).generatedDate ? new Date((p as any).generatedDate).toISOString() : null;
      });

      parsed.sort((a, b) => {
        const ta = (a as any).generatedDateNormalized ? Date.parse((a as any).generatedDateNormalized) : 0;
        const tb = (b as any).generatedDateNormalized ? Date.parse((b as any).generatedDateNormalized) : 0;
        return tb - ta;
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
      // const payload = {};
      const monthPrefix = getPeriodPrefix(selectedPeriod);
      const existingSlip = generatedPayslips[emp.id]?.[monthPrefix];

      const emergencyAdvance = existingSlip?.deductions?.emergencyAdvance ?? 0;
      const advanceRecovery = existingSlip?.deductions?.advanceRecovery ?? 0;

      const result = await apiFetch(`/payroll/generate/${emp.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month: monthPrefix,
          emergencyAdvance,
          advanceRecovery
        })
      }) as Payslip;
      setGeneratedPayslips(prev => ({ ...prev, [emp.id]: { ...(prev[emp.id] ?? {}), [result.month]: result } }));
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

  // async function emailPayslip(payslip: Payslip, to?: string) {
  //   try {
  //     const recipient = to ?? prompt('Send payslip to (email):', '');
  //     if (!recipient) return;
  //     await apiFetch(`/payroll/email-html/${payslip.id}`, { method: 'POST', body: JSON.stringify({ to: recipient }) });
  //     alert('Email request sent.');
  //   } catch (err: any) {
  //     console.error('Email failed', err);
  //     alert('Failed to send email: ' + (err?.message ?? ''));
  //   }
  // }

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

  const filteredEmployees = useMemo(() => {
    const periodMonth = selectedPeriod.getMonth();
    const periodYear = selectedPeriod.getFullYear();

    return employees.filter(emp => {
      // text search logic
      const matchesSearch =
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // joining date check
      if (!emp.joinDate) return true;

      const joinDate = new Date(emp.joinDate);
      const joinMonth = joinDate.getMonth();
      const joinYear = joinDate.getFullYear();

      // employee visible only if joinDate <= selected payroll month
      if (joinYear > periodYear) return false;
      if (joinYear === periodYear && joinMonth > periodMonth) return false;

      return true;
    });
  }, [employees, searchTerm, selectedPeriod]);


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
    const currentMonthStr = getPeriodPrefix(selectedPeriod);
    const data = filteredEmployees.map(emp => {
      const slip = generatedPayslips[emp.id]?.[currentMonthStr];
      const fixedGross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.da ?? 0) + (emp.specialAllowance ?? 0);
      return {
        EmployeeID: emp.id,
        Name: emp.name,
        Department: emp.department,
        Month: currentMonthStr,
        MonthlyGross: emp.monthlyGrossSalary,
        Generated: slip ? 'Yes' : 'No',
        PaidDays: slip ? Math.round((slip.attendancePercentage / 100) * 30) : '-',
        EarnedBasic: slip ? slip.earnings.basic : '-',
        EarnedGross: slip ? slip.earnings.gross : '-',
        PF_Deduction: slip ? slip.deductions.pf : '-',
        ESI_Deduction: slip ? slip.deductions.esi : '-',
        TotalDeductions: slip ? slip.deductions.totalDeductions : '-',
        NetPayable: slip ? slip.netSalary : '-'
      };
    });
    exportToCSV(data, `Payroll_Summary_${currentMonthStr}.csv`);
  };

  const handleExportMonthlyReport = () => {
    const currentMonthStr = getPeriodPrefix(selectedPeriod);
    const data = filteredEmployees.map(emp => {
      const slip = generatedPayslips[emp.id]?.[currentMonthStr];

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
          'Monthly Gross': emp.monthlyGrossSalary,
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
        'Monthly Gross': emp.monthlyGrossSalary,
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
    exportToCSV(data, `Monthly_Payroll_Report_${currentMonthStr}.csv`);
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

        const existingSlip =
          (employeePayslips[emp.id] || []).find(s => s.month === monthStr) ||
          generatedPayslips[emp.id]?.[monthStr];

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
            'Monthly Gross': emp.monthlyGrossSalary,
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
          const pf = emp.pfEnabled ? Math.round(basic * 0.12) : 0;
          const esi =
            emp.esiEnabled && gross < 21000
              ? Math.ceil(gross * 0.0075)
              : 0; const pt = 200;
          const tax = gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0;
          const totalDeductions = pf + esi + pt + tax;
          const netSalary = gross - totalDeductions;

          allData.push({
            'Month': monthStr,
            'Employee ID': emp.id,
            'Name': emp.name,
            'Department': emp.department,
            'Days Paid': paidDays,
            'Monthly Gross': emp.monthlyGrossSalary,
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

  const handleEmergencyAdvance = async (empId: string, value: number) => {
    const monthKey = getPeriodPrefix(selectedPeriod);
    const slip = generatedPayslips[empId]?.[monthKey];
    if (!slip) return;

    const existing = slip.deductions.emergencyAdvance ?? 0;

    let updatedAdvance = existing + value;

    if (updatedAdvance < 0) updatedAdvance = 0;

    setGeneratedPayslips(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [monthKey]: {
          ...slip,
          deductions: {
            ...slip.deductions,
            emergencyAdvance: updatedAdvance
          }
        }
      }
    }));

    await apiFetch(`/payroll/generate/${empId}`, {
      method: 'POST',
      body: JSON.stringify({
        month: monthKey,
        emergencyAdvance: updatedAdvance,
        advanceRecovery: slip.deductions.advanceRecovery ?? 0
      })
    });

    setAdvanceInput(prev => ({
      ...prev,
      [empId]: ''
    }));
  };

  const giveAdvance = (empId: string) => {
    const value = Number(advanceInput[empId] || 0);
    if (!value) return;
    handleEmergencyAdvance(empId, value);
  };

  const returnAdvance = (empId: string) => {
    const value = Number(advanceInput[empId] || 0);
    if (!value) return;
    handleEmergencyAdvance(empId, -value);
  };

  const fyOptions = useMemo(() => getFinancialYearOptions(employees), [employees]);

  const fyEndDate = useMemo(() => new Date(fyStartYear + 1, 2, 31), [fyStartYear]);

  const yearlyFilteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (!emp.joinDate) return true;
      const joinDate = new Date(emp.joinDate);
      return joinDate <= fyEndDate;
    });
  }, [employees, searchTerm, fyEndDate]);

  const yearlyRows = useMemo(
    () => yearlyFilteredEmployees.map(emp => ({ emp, fixed: calculateFixedMonthly(emp) })),
    [yearlyFilteredEmployees]
  );

  const yearlyTotals = useMemo(() => {
    return yearlyRows.reduce(
      (acc, r) => ({
        grossCTC: acc.grossCTC + r.fixed.earnings.gross * 12,
        netDisbursed: acc.netDisbursed + r.fixed.netSalary * 12,
        pfPool: acc.pfPool + r.fixed.deductions.pf * 12,
        tdsWithheld: acc.tdsWithheld + r.fixed.deductions.tax * 12,
      }),
      { grossCTC: 0, netDisbursed: 0, pfPool: 0, tdsWithheld: 0 }
    );
  }, [yearlyRows]);

  const handleExportFYRegister = () => {
    const data = yearlyRows.map(({ emp, fixed }) => ({
      'Employee ID': emp.id,
      'Name': emp.name,
      'Department': emp.department,
      'PAN': emp.pan || 'N/A',
      'Monthly Gross': fixed.earnings.gross,
      'Annual Gross CTC': fixed.earnings.gross * 12,
      'Annual PF': fixed.deductions.pf * 12,
      'Annual TDS': fixed.deductions.tax * 12,
      'Annual Net Take-Home': fixed.netSalary * 12,
    }));
    exportToCSV(data, `Payroll_FY_Register_${fyStartYear}-${fyStartYear + 1}.csv`);
  };

  const employeeAttendanceFor = (empId: string) => allAttendance.filter(a => a.employeeId === empId);
  const employeePayslipHistoryFor = (empId: string) => employeePayslips[empId] ?? [];

  useEffect(() => { setMonthlyPage(1); }, [searchTerm, selectedPeriod]);
  useEffect(() => { setYearlyPage(1); }, [searchTerm, fyStartYear]);

  const monthlyTotalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedMonthlyEmployees = useMemo(
    () => filteredEmployees.slice((monthlyPage - 1) * PAGE_SIZE, monthlyPage * PAGE_SIZE),
    [filteredEmployees, monthlyPage]
  );

  const yearlyTotalPages = Math.max(1, Math.ceil(yearlyRows.length / PAGE_SIZE));
  const paginatedYearlyRows = useMemo(
    () => yearlyRows.slice((yearlyPage - 1) * PAGE_SIZE, yearlyPage * PAGE_SIZE),
    [yearlyRows, yearlyPage]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-800">Payroll Management &amp; Salary Records</h2>
              <p className="text-slate-500 mt-1 text-sm">
                Generate monthly payslips, official Annual Salary Certificates, and 12-month salary ledgers.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex items-center gap-2 lg:gap-3 flex-nowrap">
              {activeTab === 'MONTHLY' && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm font-medium shrink-0">
                  <button
                    onClick={() => shiftPeriod(-1)}
                    className="text-slate-600 hover:text-slate-800">
                    <ChevronLeft size={18} />
                  </button>
                  <div className="text-center leading-tight whitespace-nowrap">
                    <div className="text-xs text-slate-400 uppercase">Payroll Period</div>
                    <div className="font-semibold">{selectedPeriod.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  <button
                    onClick={() => shiftPeriod(1)}
                    className="text-slate-600 hover:text-slate-800">
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {activeTab === 'YEARLY' && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm font-medium shrink-0">
                  <CalendarRange size={16} className="text-slate-400 shrink-0" />
                  <div className="text-center leading-tight whitespace-nowrap">
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
              )}

              <div className="relative shrink-0 w-40 lg:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                />
              </div>

              {activeTab === 'MONTHLY' && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
                >
                  <CalendarRange size={16} /> Range
                </button>
              )}

              {activeTab === 'YEARLY' && (
                <button
                  onClick={handleExportFYRegister}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm font-medium whitespace-nowrap text-sm"
                >
                  <FileText size={16} /> Export FY Register
                </button>
              )}
            </div>

            {activeTab === 'MONTHLY' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchLatestPayslips}
                  disabled={latestLoading}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium whitespace-nowrap text-xs"
                >
                  {latestLoading ? 'Loading…' : 'View all payslips'}
                </button>
                <button
                  onClick={handleExport}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap text-xs"
                >
                  <Download size={13} /> Summary
                </button>
                <button
                  onClick={handleExportMonthlyReport}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap text-xs"
                >
                  <FileText size={13} /> Monthly Report
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex bg-slate-100 rounded-lg border border-slate-200 p-1 w-fit">
          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'MONTHLY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={14} /> Monthly Payslips
          </button>
          <button
            onClick={() => setActiveTab('YEARLY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'YEARLY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Award size={14} /> Annual Salary Certificate &amp; Statement
          </button>
        </div>
      </div>

      {activeTab === 'MONTHLY' && (loading ? (
        <div className="p-4 md:p-6 bg-white rounded-xl shadow-sm border border-slate-100">Loading…</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center p-8 md:p-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
          No employees found matching your search.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[980px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Employee</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Fixed Basic</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Fixed Gross</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Advance / Return</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Net Payable</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">ESI / PF</th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMonthlyEmployees.map(emp => {
                  const monthKey = getPeriodPrefix(selectedPeriod);
                  const slip = generatedPayslips[emp.id]?.[monthKey];
                  const fixedGross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.da ?? 0) + (emp.specialAllowance ?? 0);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors align-middle">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {emp.name ? emp.name.charAt(0) : emp.id}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                            <p className="text-xs text-slate-500 truncate">{emp.role}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] border border-slate-200">{emp.department}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right font-medium text-slate-700 whitespace-nowrap">₹{(emp.basicSalary ?? 0).toLocaleString()}</td>
                      <td className="p-4 text-right font-medium text-slate-700 whitespace-nowrap">₹{fixedGross.toLocaleString()}</td>

                      <td className="p-4">
                        {slip ? (
                          <div className="min-w-[190px]">
                            {slip?.deductions?.emergencyAdvance > 0 && (
                              <div className="text-[11px] text-amber-600 mb-1 whitespace-nowrap">
                                Balance: ₹{slip.deductions.emergencyAdvance.toLocaleString()}
                              </div>
                            )}
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                                placeholder="Amount"
                                value={advanceInput[emp.id] ?? ''}
                                onChange={(e) =>
                                  setAdvanceInput(prev => ({
                                    ...prev,
                                    [emp.id]: Number(e.target.value || 0)
                                  }))
                                }
                              />
                              <button
                                onClick={() => giveAdvance(emp.id)}
                                className="px-2.5 py-1.5 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-50 border border-gray-200"
                              >
                                +
                              </button>
                              <button
                                onClick={() => returnAdvance(emp.id)}
                                className="px-2.5 py-1.5 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-50 border border-gray-200"
                              >
                                -
                              </button>
                            </div>
                            {slip?.deductions?.emergencyAdvance ? (
                              <div className="mt-1.5 text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded-md whitespace-nowrap">
                                ⚠ Recovery: -₹{slip.deductions.emergencyAdvance.toLocaleString()}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        {slip ? (
                          <>
                            <div className="font-bold text-emerald-700">₹{slip.netSalary.toLocaleString()}</div>
                            <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-slate-500">
                              <CalendarClock size={11} />
                              <span>{Math.round((slip.attendancePercentage / 100) * 30)} days present</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${emp.esiEnabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                            ESI {emp.esiEnabled ? 'On' : 'Off'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${emp.pfEnabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                            PF {emp.pfEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2 min-w-[110px]">
                          {slip && (
                            <>
                              <button
                                onClick={() => viewPayslip(emp, slip)}
                                title="View Payslip"
                                aria-label="View Payslip"
                                className="p-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                onClick={async () => {
                                  const ok = window.confirm('This will regenerate and overwrite the existing payslip. Continue?');
                                  if (!ok) return;

                                  setLoadingId(emp.id);
                                  try {
                                    await generatePayslip(emp);
                                    await fetchPayslipHistory(emp.id);
                                  } finally {
                                    setLoadingId(null);
                                  }
                                }}
                                disabled={loadingId === emp.id}
                                title="Regenerate Payslip"
                                aria-label="Regenerate Payslip"
                                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                              >
                                {loadingId === emp.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                              </button>
                            </>
                          )}

                          {!slip && (
                            <button
                              onClick={async () => {
                                setLoadingId(emp.id);
                                try {
                                  await generatePayslip(emp);
                                  await fetchPayslipHistory(emp.id);
                                } finally {
                                  setLoadingId(null);
                                }
                              }}
                              disabled={loadingId === emp.id}
                              className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition flex items-center justify-center gap-1.5 text-xs whitespace-nowrap disabled:opacity-60"
                            >
                              {loadingId === emp.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              {loadingId === emp.id ? 'Calculating...' : `Calculate ${formatPeriodLabel(selectedPeriod)}`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={monthlyPage}
            totalPages={monthlyTotalPages}
            totalItems={filteredEmployees.length}
            pageSize={PAGE_SIZE}
            onChange={setMonthlyPage}
          />
        </div>
      ))}

      {activeTab === 'YEARLY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Annual Gross CTC (FY {fyStartYear}-{fyStartYear + 1})</p>
              <p className="text-xl font-bold text-slate-800 mt-1">₹{Math.round(yearlyTotals.grossCTC).toLocaleString('en-IN')}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Across {yearlyRows.length} employees</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Annual Net Disbursed</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">₹{Math.round(yearlyTotals.netDisbursed).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-400 mt-1">Direct Take-Home Pay</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Annual PF Pool</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">₹{Math.round(yearlyTotals.pfPool).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-400 mt-1">Statutory Provident Fund</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Annual TDS Withheld</p>
              <p className="text-xl font-bold text-purple-700 mt-1">₹{Math.round(yearlyTotals.tdsWithheld).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-400 mt-1">Income Tax Deducted</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-2">
              <FileSignature className="text-emerald-600" size={18} />
              <div>
                <h3 className="font-bold text-slate-800">Employee Annual Salary Statements &amp; Certificates</h3>
                <p className="text-slate-500 text-xs mt-0.5">Select any employee to generate official salary certificate letters or 12-month payroll ledger statements for FY {fyStartYear}-{fyStartYear + 1}.</p>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-slate-400">Loading…</div>
            ) : yearlyRows.length === 0 ? (
              <div className="text-center p-8 md:p-12 text-slate-400 border-dashed">No employees found matching your search.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Employee</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">PAN &amp; Dept</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Monthly Gross</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Annual Gross CTC</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Annual PF</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Annual TDS</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Annual Net Take-Home</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions &amp; Certifications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedYearlyRows.map(({ emp, fixed }) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {emp.name ? emp.name.charAt(0) : emp.id}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{emp.name}</p>
                              <p className="text-xs text-slate-500">{emp.role} &bull; {emp.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          <div className="uppercase">{emp.pan || 'N/A'}</div>
                          <div className="text-slate-400">{emp.department || 'N/A'}</div>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">₹{fixed.earnings.gross.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right font-bold text-slate-800">₹{(fixed.earnings.gross * 12).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right text-indigo-600 font-medium">₹{(fixed.deductions.pf * 12).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right text-purple-600 font-medium">₹{(fixed.deductions.tax * 12).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right text-emerald-700 font-bold">₹{(fixed.netSalary * 12).toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setAnnualDoc({ emp, view: 'certificate' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold whitespace-nowrap"
                            >
                              <Award size={13} /> Certificate
                            </button>
                            <button
                              onClick={() => setAnnualDoc({ emp, view: 'statement' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs font-bold whitespace-nowrap"
                            >
                              <TableIcon size={13} /> 12-Mo Statement
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {yearlyRows.length > 0 && (
              <PaginationBar
                page={yearlyPage}
                totalPages={yearlyTotalPages}
                totalItems={yearlyRows.length}
                pageSize={PAGE_SIZE}
                onChange={setYearlyPage}
              />
            )}
          </div>
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

      {annualDoc && (
        <AnnualDocumentModal
          employee={annualDoc.emp}
          fyOptions={fyOptions}
          initialFYStartYear={fyStartYear}
          initialView={annualDoc.view}
          attendanceRecords={employeeAttendanceFor(annualDoc.emp.id)}
          payslipHistory={employeePayslipHistoryFor(annualDoc.emp.id)}
          onClose={() => setAnnualDoc(null)}
        />
      )}
    </div>
  );
};

const PaginationBar: React.FC<{
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}> = ({ page, totalPages, totalItems, pageSize, onChange }) => {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-500">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold text-slate-700 px-1 whitespace-nowrap">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PayrollManager;
