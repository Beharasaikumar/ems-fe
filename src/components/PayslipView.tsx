// src/components/PayslipView.tsx
import React, { useEffect, useState } from 'react';
import { Employee, Payslip } from '../types';
import { X, Download, Share2, Mail, CheckCircle, Leaf } from 'lucide-react';

interface PayslipViewProps {
  
  employee?: Employee;  
  payslip: Payslip | { id: string; employeeId?: string; month?: string; year?: number; netSalary?: number;  };
  onClose: () => void;
}

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';
function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }

export const PayslipView: React.FC<PayslipViewProps> = ({ employee: initialEmployee, payslip: initialPayslip, onClose }) => {
  const [remotePayslip, setRemotePayslip] = useState<any | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(initialEmployee ?? null);
  const [loading, setLoading] = useState<boolean>(!!initialPayslip && !!(initialPayslip as any).id);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const payslipId = (initialPayslip as any)?.id;

  useEffect(() => {
    let cancelled = false;
    async function loadView() {
      if (!payslipId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/payroll/view/${encodeURIComponent(payslipId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `Failed to load payslip (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;
        setRemotePayslip(data);
        if (data.employee) setEmployee(data.employee);
      } catch (err: any) {
        console.error('Failed to fetch payslip view', err);
       } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadView();
    return () => { cancelled = true; };
  }, [payslipId]);

   
  const payload = remotePayslip ?? (initialPayslip as any);

  
  const monthLabel = (() => {
    try {
      const month = payload.month ?? (initialPayslip as any)?.month ?? '';
      const year = payload.year ?? (initialPayslip as any)?.year ?? new Date().getFullYear();
      if (!month) return '';
      const mi = parseInt(String(month).split('-')[1] ?? '1', 10) - 1;
      return new Date(year, mi).toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return (payload.month ?? (initialPayslip as any)?.month) ?? '';
    }
  })();

  const getShareText = () => {
    return `Payslip for ${monthLabel}\n\nCompany: Lomaa IT Solutions\nEmployee: ${employee?.name ?? payload.employeeName ?? payload.employeeId}\nNet Pay: ₹${(payload.netSalary ?? 0).toLocaleString('en-IN')}\n\nRemarks:\n${payload.remarks ?? ''}`;
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(getShareText())}`;
  const mailtoUrl = `mailto:${employee?.email ?? ''}?subject=${encodeURIComponent(`Payslip for ${employee?.name ?? ''}`)}&body=${encodeURIComponent(getShareText())}`;

  async function downloadPdfFromServer() {
    try {
      if (!payslipId) return alert('Payslip id missing');
      setDownloading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/payroll/pdf/${encodeURIComponent(payslipId)}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeMonth = (payload.month ?? 'month').replace('/', '-');
      a.download = `payslip-${payload.employeeId ?? 'emp'}-${safeMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download PDF failed', err);
      alert(err?.message ?? 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function sendPayslipEmail() {
    try {
      if (!payslipId) return alert('Payslip id missing');
      const to = employee?.email ?? prompt('Send payslip to (email):', '') ?? '';
      if (!to) return;
      setSending(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/payroll/email/${encodeURIComponent(payslipId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ to })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Email send failed (${res.status})`);
      }
      alert('Email request sent. (If SMTP configured, employee will receive mail.)');
    } catch (err: any) {
      console.error('Email failed', err);
      alert(err?.message ?? 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

   
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Payslip Preview</h2>
            <p className="text-emerald-300 text-sm">{monthLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
          {loading ? (
            <div className="text-center py-12">Loading payslip…</div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 max-w-2xl mx-auto" id="printable-area">
               <div className="text-center border-b border-slate-200 pb-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-lg">
                    <div className="relative">
                      <span className="text-xl font-bold text-white">L</span>
                      <Leaf className="absolute -top-1 -right-2 text-emerald-500 w-3 h-3 fill-emerald-500" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h1 className="text-2xl font-bold text-slate-800 leading-none">Lomaa</h1>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">IT SOLUTIONS</p>
                  </div>
                </div>
                <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">India | USA | Australia | Ireland</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Employee Name</span>
                  <div className="font-bold text-slate-800">{employee?.name ?? payload.employeeName}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Employee ID</span>
                  <div className="font-bold text-slate-800">{payload.employeeId}</div>
                </div>      
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Department</span>
                <span className="font-bold text-slate-800">{employee?.department ?? payload.employee?.department ?? 'N/A'}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Designation</span>
                <span className="font-bold text-slate-800">{employee?.role ?? payload.employee?.role ?? 'N/A'}</span>
              </div>

              <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase tracking-wide">Bank Account</span>
                 <span className="font-semibold text-slate-700">{employee?.bankAccountNumber ?? payload.employee?.bankAccountNumber ?? 'N/A'}</span>
              </div>
              <div className="flex flex-col text-right">
                 <span className="text-xs text-slate-500 uppercase tracking-wide">PAN Number</span>
                 <span className="font-semibold text-slate-700 uppercase">{(employee?.pan ?? payload.employee?.pan ?? 'N/A')}</span>
              </div>

              <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase tracking-wide">PF No</span>
                 <span className="font-semibold text-slate-700 uppercase">{employee?.pfAccountNumber ?? payload.employee?.pfAccountNumber ?? 'N/A'}</span>
              </div>
               <div className="flex flex-col text-right">
                 <span className="text-xs text-slate-500 uppercase tracking-wide">Days Present</span>
                 <span className="font-semibold text-slate-700">{Math.round(((payload.attendancePercentage ?? payload.attendancePercentage ?? 0) / 100) * 30)} days</span>
              </div>
            </div>

            {/* Salary Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
              <div className="grid grid-cols-2 bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                <div className="p-3">Earnings</div>
                <div className="p-3 border-l border-slate-200">Deductions</div>
              </div>
              <div className="grid grid-cols-2 text-sm">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between"><span>Basic Salary</span> <span>₹{payload.earnings.basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>HRA</span> <span>₹{payload.earnings.hra.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>DA</span> <span>₹{payload.earnings.da.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Special Allow.</span> <span>₹{payload.earnings.specialAllowance.toLocaleString()}</span></div>
                </div>
                <div className="p-4 space-y-3 border-l border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between text-slate-700"><span>PF (12%)</span> <span>₹{payload.deductions.pf.toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-700"><span>ESI (0.75%)</span> <span>₹{payload.deductions.esi.toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-700"><span>Prof. Tax</span> <span>₹{payload.deductions.pt.toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-700"><span>TDS</span> <span>₹{payload.deductions.tax.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 font-bold bg-slate-50 border-t border-slate-200">
                <div className="p-3 flex justify-between"><span>Gross Earnings</span> <span>₹{payload.earnings.gross.toLocaleString()}</span></div>
                <div className="p-3 border-l border-slate-200 flex justify-between text-red-600"><span>Total Ded.</span> <span>₹{payload.deductions.totalDeductions.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex justify-between items-center mb-6">
              <span className="font-bold text-emerald-900 text-lg">Net Pay</span>
              <span className="font-bold text-emerald-700 text-2xl">₹{payload.netSalary.toLocaleString('en-IN')}</span>
            </div>

            {(payload.remarks ?? employee?.remarks) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <CheckCircle size={14} /> HR Remarks
                </p>
                <p className="text-slate-700 italic">"{employee.remarks}"</p>
              </div>
            )}
 
                <div className="mt-8 text-center">
                  <p className="text-[10px] text-slate-400">This is a system-generated payslip and does not require a signature.</p>
                </div>
              </div>
            
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 flex gap-4 justify-end shrink-0">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
            <Share2 size={18} /> WhatsApp
          </a>

          <a href={mailtoUrl} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
            <Mail size={18} /> Email
          </a>

          <button onClick={downloadPdfFromServer} disabled={downloading} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60">
            <Download size={18} /> {downloading ? 'Preparing...' : 'Download (PDF)'}
          </button>

          <button onClick={sendPayslipEmail} disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-60">
            <Mail size={18} /> {sending ? 'Sending…' : 'Send Email'}
          </button>

          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors">
            <Download size={18} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
