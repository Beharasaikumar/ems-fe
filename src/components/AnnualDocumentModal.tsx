import React, { useMemo, useState } from 'react';
import { Award, Table, X, Download, Printer, Share2, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Employee, Payslip } from '../types';
import { exportToCSV } from '../utils/utils';
import {
  FlatAttendanceRecord,
  FYOption,
  formatINR,
  monthLabel,
  monthPrefix,
  getFinancialYearMonths,
  calculateFixedMonthly,
  calculateHistoricalPayroll,
  mergeEarningsForDisplay,
  findSavedPayslip,
  isMonthBeforeJoin,
  isMonthInFuture,
  countPaidDays,
  amountInWordsINR,
} from '../utils/annualPayroll';

interface AnnualDocumentModalProps {
  employee: Employee;
  fyOptions: FYOption[];
  initialFYStartYear: number;
  attendanceRecords: FlatAttendanceRecord[];
  payslipHistory: Payslip[];
  initialView?: 'certificate' | 'statement';
  onClose: () => void;
}

type MonthRow = {
  label: string;
  prefix: string;
  paidDays: number;
  totalDays: number;
  basic: number;
  hra: number;
  special: number;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tax: number;
  advance: number;
  totalDeductions: number;
  netSalary: number;
  active: boolean;
};

export const AnnualDocumentModal: React.FC<AnnualDocumentModalProps> = ({
  employee,
  fyOptions,
  initialFYStartYear,
  attendanceRecords,
  payslipHistory,
  initialView = 'certificate',
  onClose,
}) => {
  const [view, setView] = useState<'certificate' | 'statement'>(initialView);
  const [fyStartYear, setFyStartYear] = useState(initialFYStartYear);
  const [busy, setBusy] = useState(false);

  const fyLabel = `FY ${fyStartYear} - ${fyStartYear + 1}`;
  const fyRangeLabel = `1st April ${fyStartYear} to 31st March ${fyStartYear + 1}`;
  const refNo = `LOMAA/ASC/${fyStartYear}${fyStartYear + 1}/${employee.id}`;
  const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const fixed = useMemo(() => calculateFixedMonthly(employee), [employee]);

  const monthRows: MonthRow[] = useMemo(() => {
    const months = getFinancialYearMonths(fyStartYear);
    return months.map(m => {
      const prefix = monthPrefix(m);
      const totalDays = new Date(m.year, m.monthIndex + 1, 0).getDate();

      if (isMonthBeforeJoin(employee, m)) {
        return {
          label: monthLabel(m), prefix, paidDays: 0, totalDays, basic: 0, hra: 0, special: 0, gross: 0,
          pf: 0, esi: 0, pt: 0, tax: 0, advance: 0, totalDeductions: 0, netSalary: 0, active: false,
        };
      }

      const saved = findSavedPayslip(payslipHistory, m);

      if (!saved && isMonthInFuture(m)) {
        return {
          label: monthLabel(m), prefix, paidDays: 0, totalDays, basic: 0, hra: 0, special: 0, gross: 0,
          pf: 0, esi: 0, pt: 0, tax: 0, advance: 0, totalDeductions: 0, netSalary: 0, active: false,
        };
      }

      const attendanceForMonth = attendanceRecords.filter(a => a.employeeId === employee.id && a.date.startsWith(prefix));
      const paidDays = countPaidDays(attendanceForMonth, totalDays);

      if (saved) {
        const merged = mergeEarningsForDisplay(saved.earnings as any);
        const d = saved.deductions as any;
        return {
          label: monthLabel(m), prefix, paidDays, totalDays,
          basic: merged.basic, hra: merged.hra, special: merged.special, gross: merged.gross,
          pf: d.pf ?? 0, esi: d.esi ?? 0, pt: d.pt ?? 0, tax: d.tax ?? 0,
          advance: (d.emergencyAdvance ?? 0), totalDeductions: d.totalDeductions ?? 0, netSalary: saved.netSalary ?? 0,
          active: true,
        };
      }

      const projected = calculateHistoricalPayroll(employee, m, attendanceForMonth);
      return {
        label: monthLabel(m), prefix, paidDays: projected.paidDays, totalDays: projected.totalDays,
        basic: projected.earnings.basic, hra: projected.earnings.hra, special: projected.earnings.special,
        gross: projected.earnings.gross, pf: projected.deductions.pf, esi: projected.deductions.esi,
        pt: projected.deductions.pt, tax: projected.deductions.tax, advance: projected.deductions.advance,
        totalDeductions: projected.deductions.totalDeductions, netSalary: projected.netSalary, active: true,
      };
    });
  }, [employee, fyStartYear, attendanceRecords, payslipHistory]);

  const activeRows = monthRows.filter(r => r.active);
  const totalPaidDays = activeRows.reduce((s, r) => s + r.paidDays, 0);
  const totalDaysAll = activeRows.reduce((s, r) => s + r.totalDays, 0);

  const annualGrossCTC = fixed.earnings.gross * 12;
  const annualPF = fixed.deductions.pf * 12;
  const annualPT = fixed.deductions.pt * 12;
  const annualTax = fixed.deductions.tax * 12;
  const annualStatutory = annualPF + annualPT + annualTax;
  const annualNet = annualGrossCTC - annualStatutory;

  const registerTotals = monthRows.reduce(
    (acc, r) => ({
      basic: acc.basic + r.basic, hra: acc.hra + r.hra, special: acc.special + r.special, gross: acc.gross + r.gross,
      pf: acc.pf + r.pf, deductions: acc.deductions + r.totalDeductions, net: acc.net + r.netSalary,
    }),
    { basic: 0, hra: 0, special: 0, gross: 0, pf: 0, deductions: 0, net: 0 }
  );

  async function downloadPdf() {
    const el = document.getElementById('annual-doc-printable');
    if (!el) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      // Custom page size matching the content exactly — always one page, never cropped or split.
      const pdf = new jsPDF({ orientation: imgHeight >= imgWidth ? 'portrait' : 'landscape', unit: 'mm', format: [imgWidth, imgHeight] });
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const kind = view === 'certificate' ? 'Certificate' : 'Statement';
      pdf.save(`${kind}_${employee.id}_${fyStartYear}-${fyStartYear + 1}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const el = document.getElementById('annual-doc-printable');
    if (!el) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: imgHeight >= imgWidth ? 'portrait' : 'landscape', unit: 'mm', format: [imgWidth, imgHeight] });
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const blob = pdf.output('blob');
      const kind = view === 'certificate' ? 'Certificate' : 'Statement';
      const fileName = `${kind}_${employee.id}_${fyStartYear}-${fyStartYear + 1}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: fileName, text: `${kind} for ${employee.name} — ${fyLabel}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        alert('Sharing is not supported on this browser — the PDF was downloaded instead.');
      }
    } catch (err) {
      console.error('Share failed', err);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (view === 'certificate') {
      exportToCSV([
        { Component: 'Basic Salary', Monthly: fixed.earnings.basic, Annual: fixed.earnings.basic * 12 },
        { Component: 'HRA', Monthly: fixed.earnings.hra, Annual: fixed.earnings.hra * 12 },
        { Component: 'Special Allowance & Other Benefits', Monthly: fixed.earnings.special, Annual: fixed.earnings.special * 12 },
        { Component: 'Gross Salary Earnings', Monthly: fixed.earnings.gross, Annual: annualGrossCTC },
        { Component: 'Employee Provident Fund (PF)', Monthly: fixed.deductions.pf, Annual: annualPF },
        { Component: 'Professional Tax (PT)', Monthly: fixed.deductions.pt, Annual: annualPT },
        { Component: 'Tax Deducted at Source (TDS)', Monthly: fixed.deductions.tax, Annual: annualTax },
        { Component: 'Net Annual Remuneration', Monthly: fixed.netSalary, Annual: annualNet },
      ], `Certificate_${employee.id}_${fyStartYear}-${fyStartYear + 1}.csv`);
    } else {
      exportToCSV(monthRows.map(r => ({
        Month: r.label, 'Paid/Total': `${r.paidDays}/${r.totalDays}`, Basic: r.basic, HRA: r.hra, Special: r.special,
        Gross: r.gross, PF: r.pf, ESI: r.esi, PT: r.pt, TDS: r.tax, Advance: r.advance,
        'Total Deductions': r.totalDeductions, 'Net Disbursed': r.netSalary,
      })), `Statement_${employee.id}_${fyStartYear}-${fyStartYear + 1}.csv`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in-up">
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Award size={18} className="text-emerald-400" /> Annual Salary Certificate &amp; Statement
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 truncate">
              {employee.name} ({employee.id}) &bull; {employee.role || 'N/A'} &bull; {employee.department || 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={fyStartYear}
                onChange={(e) => setFyStartYear(Number(e.target.value))}
                className="appearance-none bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {fyOptions.map(opt => (
                  <option key={opt.startYear} value={opt.startYear}>
                    {opt.label}{opt.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex bg-slate-800 rounded-lg border border-slate-700 p-1">
              <button
                onClick={() => setView('certificate')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'certificate' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
              >
                <Award size={13} /> Certificate
              </button>
              <button
                onClick={() => setView('statement')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'statement' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
              >
                <Table size={13} /> 12-Month Statement
              </button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto bg-slate-50 flex-1">
          {view === 'certificate' ? (
            <div id="annual-doc-printable" className="relative bg-white border border-slate-200 shadow-sm rounded-xl p-8 max-w-3xl mx-auto text-slate-800">
              <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
                <img src="/watermark.png" alt="" className="w-80 h-80 object-contain opacity-[0.12]" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start pb-5 border-b border-slate-200 mb-5 gap-4">
                  <div className="flex gap-3 items-start">
                    <img src="/logo.svg" alt="Lomaa IT Solutions" className="h-11 w-auto shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-lg leading-tight">LOMAA IT SOLUTIONS</h3>
                      {/* <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enterprise Software &amp; IT Consulting Services</p> */}
                      <p className="text-[10px] text-slate-400 mt-1">GSTIN: 37AALFL9327Q1ZC</p>
                      <p className="text-[10px] text-slate-400 mt-1">1-118-24/2, 2nd floor, sector 12, near Ushodaya Junc., MVP, Visakhapatnam, AP - 530017</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 whitespace-nowrap">OFFICIAL DOCUMENT</span>
                </div>

                <div className="flex justify-between text-xs text-slate-500 mb-6">
                  <span>Ref. No: <span className="font-semibold text-slate-700">{refNo}</span></span>
                  <span>Date of Issue: <span className="font-semibold text-slate-700">{issueDate}</span></span>
                </div>

                <div className="text-center mb-6">
                  <h1 className="text-lg font-extrabold uppercase tracking-wide">Annual Salary Certificate</h1>
                  <p className="text-emerald-700 font-bold text-sm mt-1">Financial Year {fyLabel} ({fyRangeLabel})</p>
                </div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">To Whomsoever It May Concern</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-6">
                  This is to certify that <strong>{employee.name}</strong> (Employee ID: <strong>{employee.id}</strong>) is a bonafide
                  full-time employee of Lomaa IT Solutions, currently working in the capacity of <strong>{employee.role || 'N/A'}</strong> in
                  the <strong>{employee.department || 'N/A'}</strong> department{employee.joinDate ? <> since <strong>{employee.joinDate}</strong></> : null}.
                  As per our official employment and payroll records, the annual compensation details, salary drawn and statutory
                  deductions for the period of <strong>FY {fyLabel}</strong> are detailed below:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs">
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">PAN Number</p><p className="font-semibold uppercase">{employee.pan || 'N/A'}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Bank Account No.</p><p className="font-semibold">•••• {(employee.bankAccountNumber || '').slice(-4) || 'N/A'}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">PF / UAN No.</p><p className="font-semibold">{employee.pfAccountNumber || 'N/A'}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Total Paid Days</p><p className="font-semibold text-emerald-700">{totalPaidDays} / {totalDaysAll} Days</p></div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <div className="grid grid-cols-3 bg-slate-900 text-white text-[11px] font-bold uppercase">
                    <div className="p-2.5 px-4">Compensation Component</div>
                    <div className="p-2.5 text-right">Monthly Rate (₹)</div>
                    <div className="p-2.5 pr-4 text-right">Annual Amount (FY {fyLabel})</div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-4 py-1.5">A. Earnings &amp; Allowances</div>
                  <Row label={`Basic Salary (${employee.basicSalary && fixed.earnings.gross ? Math.round((fixed.earnings.basic / fixed.earnings.gross) * 100) : 0}% of Gross)`} monthly={fixed.earnings.basic} annual={fixed.earnings.basic * 12} />
                  <Row label="House Rent Allowance (HRA)" monthly={fixed.earnings.hra} annual={fixed.earnings.hra * 12} />
                  <Row label="Special Allowance & Other Benefits" monthly={fixed.earnings.special} annual={fixed.earnings.special * 12} />
                  <Row label="Gross Salary Earnings (A)" monthly={fixed.earnings.gross} annual={annualGrossCTC} bold highlight />

                  <div className="bg-red-50 text-red-700 text-[11px] font-bold px-4 py-1.5 border-t border-slate-200">B. Statutory &amp; Other Deductions</div>
                  <Row label="Employee Provident Fund (PF / EPF)" monthly={fixed.deductions.pf} annual={annualPF} />
                  <Row label="Professional Tax (PT)" monthly={null} annual={annualPT} />
                  <Row label="Tax Deducted at Source (TDS / Income Tax)" monthly={null} annual={annualTax} />
                  <Row label="Total Statutory Deductions (B)" monthly={null} annual={annualStatutory} bold highlight tone="red" />
                </div>

                <div className="bg-emerald-600 text-white rounded-lg p-4 flex justify-between items-center mb-4">
                  <span className="font-bold text-sm">Net Annual Remuneration Disbursed (A − B)</span>
                  <span className="font-extrabold text-xl">{formatINR(annualNet)}</span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase text-[10px] font-bold">Annual Net Salary in Words</p>
                    <p className="font-semibold text-slate-700">{amountInWordsINR(annualNet)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 whitespace-nowrap">
                    Issued for: Official Verification &amp; Financial Purposes
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 italic mb-8">
                  This salary certificate is issued upon the request of the employee without any financial or legal liability on the part of Lomaa IT Solutions or its management.
                </p>

                <div className="flex justify-between items-end pt-4 border-t border-dashed border-slate-200">
                  <div className="relative text-[10px] text-slate-400 max-w-[55%]">
                    <p className="text-[10px] text-slate-500">For Lomaa IT Solutions</p>

                    <img src="/stamp.png" alt="Lomaa IT Solutions Stamp" className="absolute left-0 top-2 w-28 h-28 object-contain opacity-70 -rotate-6 pointer-events-none select-none" />
                    <img src="/hrsign.png" alt="Authorized Signature" className="absolute left-0 top-2 w-36 h-auto object-contain pointer-events-none select-none" />

                    <p className="pt-12 text-[12px] text-slate-500 mt-1">Authorized Signatory</p>
                    <p className="text-[12px] text-slate-400">D. Lavanya</p>
                    <p className="text-[12px] text-slate-400">Director</p>
                  </div>
                  {/* <div className="text-right">
                  <img src="/hrsign.png" alt="Authorized Signature" className="h-24 w-auto ml-auto -mb-2" />
                  <p className="text-[10px] text-slate-500">Authorized Signatory / HR Head</p>
                  <p className="text-[10px] text-slate-400">Corporate HR &amp; Operations</p>
                </div> */}
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-1 mt-6 pt-3 border-t border-slate-100 text-[9px] text-slate-400">
                  <span>System-Generated Document • Tamper-proof Financial Ledger</span>
                  <span>Page 1 of 1</span>
                  <span>Lomaa IT Solutions • Confidential</span>
                </div>
              </div>
            </div>
          ) : (
            <div id="annual-doc-printable" className="relative bg-white border border-slate-200 shadow-sm rounded-xl p-6 md:p-8 max-w-5xl mx-auto text-slate-800">
              <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
                <img src="/watermark.png" alt="" className="w-96 h-96 object-contain opacity-[0.12]" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start pb-4 border-b border-slate-200 mb-4 gap-4">
                  <div className="flex gap-3 items-start">
                    <img src="/logo.svg" alt="Lomaa IT Solutions" className="h-11 w-auto shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-lg leading-tight">LOMAA IT SOLUTIONS</h3>
                      <p className="text-[10px] text-slate-400 mt-1">GSTIN: 37AALFL9327Q1ZC</p>
                      <p className="text-[10px] text-slate-400 mt-1">1-118-24/2, 2nd floor, sector 12, near Ushodaya Junc., MVP, Visakhapatnam, AP - 530017</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 whitespace-nowrap">FY {fyLabel}</span>
                    <p className="text-[10px] text-slate-400 mt-1.5">Issue Date: {issueDate}</p>
                    <p className="text-[10px] text-slate-400">Ref: {refNo}</p>
                  </div>
                </div>

                <div className="text-center mb-5">
                  <h1 className="text-md font-extrabold uppercase tracking-wide">12-Month Annual Salary Statement &amp; Payroll Register</h1>
                  <p className="text-emerald-700 font-bold text-xs mt-1 uppercase">Assessment Period: {fyRangeLabel}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 text-xs">
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Employee Name</p><p className="font-semibold">{employee.name}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Designation &amp; Dept</p><p className="font-semibold">{employee.role || 'N/A'} &bull; {employee.department || 'N/A'}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">PAN / UAN-PF</p><p className="font-semibold">{employee.pan || 'N/A'} / {employee.pfAccountNumber || 'N/A'}</p></div>
                  <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Monthly Base Gross</p><p className="font-semibold">{formatINR(fixed.earnings.gross)}</p></div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto mb-6">
                  <table className="w-full text-[11px] min-w-[860px]">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase">
                        <th className="p-2 px-3 text-left font-bold">Month</th>
                        <th className="p-2 text-right font-bold">Paid/Total</th>
                        <th className="p-2 text-right font-bold">Basic (₹)</th>
                        <th className="p-2 text-right font-bold">HRA (₹)</th>
                        <th className="p-2 text-right font-bold">Special (₹)</th>
                        <th className="p-2 text-right font-bold bg-emerald-800">Gross (₹)</th>
                        <th className="p-2 text-right font-bold">PF (₹)</th>
                        <th className="p-2 text-right font-bold">ESI (₹)</th>
                        <th className="p-2 text-right font-bold">PT (₹)</th>
                        <th className="p-2 text-right font-bold">TDS (₹)</th>
                        <th className="p-2 text-right font-bold">ADV (₹)</th>
                        <th className="p-2 text-right font-bold text-red-300">Total Ded.</th>
                        <th className="p-2 px-3 text-right font-bold bg-emerald-800">Net Disbursed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthRows.map(r => (
                        <tr key={r.prefix} className={r.active ? '' : 'text-slate-300'}>
                          <td className="p-2 px-3 font-semibold">{r.label}</td>
                          <td className="p-2 text-right">{r.active ? `${r.paidDays}/${r.totalDays}` : '—'}</td>
                          <td className="p-2 text-right">{r.active ? r.basic.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active ? r.hra.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active ? r.special.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right font-semibold bg-emerald-50/60">{r.active ? r.gross.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active ? r.pf.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active && r.esi ? r.esi.toLocaleString('en-IN') : '-'}</td>
                          <td className="p-2 text-right">{r.active ? r.pt.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active ? r.tax.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 text-right">{r.active && r.advance ? r.advance.toLocaleString('en-IN') : '-'}</td>
                          <td className="p-2 text-right text-red-600 font-medium">{r.active ? r.totalDeductions.toLocaleString('en-IN') : '—'}</td>
                          <td className="p-2 px-3 text-right font-bold bg-emerald-50/60">{r.active ? r.netSalary.toLocaleString('en-IN') : '—'}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="p-2 px-3">Annual Total</td>
                        <td className="p-2 text-right">{totalPaidDays}/{totalDaysAll}</td>
                        <td className="p-2 text-right">{registerTotals.basic.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">{registerTotals.hra.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">{registerTotals.special.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right bg-emerald-700">{registerTotals.gross.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">{registerTotals.pf.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right text-red-300">{registerTotals.deductions.toLocaleString('en-IN')}</td>
                        <td className="p-2 px-3 text-right bg-emerald-700">{registerTotals.net.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <SummaryTile label="Annual Gross Remuneration" value={formatINR(registerTotals.gross)} sub="Total CTC Disbursable" />
                  <SummaryTile label="Total PF Accumulation" value={formatINR(registerTotals.pf)} sub="EPFO Statutory Pool" />
                  <SummaryTile label="Total Deductions & TDS" value={formatINR(registerTotals.deductions)} sub="Tax & Statutory Withholdings" tone="amber" />
                  <SummaryTile label="Net Annual Disbursed" value={formatINR(registerTotals.net)} sub="Direct Net Bank Credits" tone="dark" />
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-dashed border-slate-200">
                  <div className="relative text-[10px] text-slate-400 max-w-[55%]">
                    <p className="text-[10px] text-slate-500">For Lomaa IT Solutions</p>

                    <img src="/stamp.png" alt="Lomaa IT Solutions Stamp" className="absolute left-0 top-2 w-28 h-28 object-contain opacity-70 -rotate-6 pointer-events-none select-none" />
                    <img src="/hrsign.png" alt="Authorized Signature" className="absolute left-0 top-2 w-36 h-auto object-contain pointer-events-none select-none" />

                    <p className="pt-12 text-[12px] text-slate-500 mt-1">Authorized Signatory</p>
                    <p className="text-[12px] text-slate-400">D. Lavanya</p>
                    <p className="text-[12px] text-slate-400">Director</p>
                  </div>
                  {/* <div className="text-right">
                  <img src="/hrsign.png" alt="Authorized Signature" className="h-24 w-auto ml-auto -mb-2" />
                  <p className="text-[10px] text-slate-500">Authorized Signatory / HR Head</p>
                  <p className="text-[10px] text-slate-400">Lomaa IT Solutions</p>
                </div> */}
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-1 mt-4 pt-3 border-t border-slate-100 text-[9px] text-slate-400">
                  <span>System Generated Document • Tamper-proof Financial Ledger</span>
                  <span>Ref: {refNo}</span>
                  <span>Lomaa IT Solutions • Confidential</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center shrink-0">
          <span className="text-xs text-slate-400">{busy ? 'Preparing…' : 'Ready for official download or printing (FY ' + fyLabel.replace('FY ', '') + ')'}</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors">
              <Printer size={16} /> Print
            </button>
            <button onClick={share} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              <Share2 size={16} /> Share
            </button>
            <button onClick={downloadPdf} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; monthly: number | null; annual: number; bold?: boolean; highlight?: boolean; tone?: 'red' }> = ({ label, monthly, annual, bold, highlight, tone }) => (
  <div className={`grid grid-cols-3 text-xs border-t border-slate-100 ${highlight ? (tone === 'red' ? 'bg-red-50' : 'bg-emerald-50') : ''}`}>
    <div className={`p-2.5 px-4 ${bold ? 'font-bold' : ''} ${tone === 'red' && highlight ? 'text-red-700' : highlight ? 'text-emerald-800' : 'text-slate-600'}`}>{label}</div>
    <div className={`p-2.5 text-right ${bold ? 'font-bold' : ''} ${tone === 'red' && highlight ? 'text-red-700' : highlight ? 'text-emerald-800' : 'text-slate-700'}`}>
      {monthly === null ? '—' : monthly.toLocaleString('en-IN')}
    </div>
    <div className={`p-2.5 pr-4 text-right ${bold ? 'font-bold' : ''} ${tone === 'red' && highlight ? 'text-red-700' : highlight ? 'text-emerald-800' : 'text-slate-700'}`}>
      {annual.toLocaleString('en-IN')}
    </div>
  </div>
);

const SummaryTile: React.FC<{ label: string; value: string; sub: string; tone?: 'amber' | 'dark' }> = ({ label, value, sub, tone }) => {
  const bg = tone === 'amber' ? 'bg-amber-50 border-amber-100' : tone === 'dark' ? 'bg-slate-900 border-slate-900' : 'bg-emerald-50 border-emerald-100';
  const labelColor = tone === 'dark' ? 'text-slate-400' : tone === 'amber' ? 'text-amber-600' : 'text-emerald-600';
  const valueColor = tone === 'dark' ? 'text-white' : tone === 'amber' ? 'text-amber-700' : 'text-emerald-700';
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${labelColor}`}>{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${valueColor}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 ${tone === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>
    </div>
  );
};

export default AnnualDocumentModal;
