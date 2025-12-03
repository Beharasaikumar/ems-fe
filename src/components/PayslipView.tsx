import React, { useEffect, useState } from 'react';
import { Employee, Payslip } from '../types';
import { X, Download, Share2, Mail, CheckCircle, Leaf, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
interface PayslipViewProps {
  employee?: Employee;
  payslip: Payslip | { id: string; employeeId?: string; month?: string; year?: number; netSalary?: number; };
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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
    const empName = employee?.name ?? payload.employeeName ?? 'N/A';
    const empId = payload.employeeId ?? 'N/A';
    const dept = employee?.department ?? payload.employee?.department ?? 'N/A';
    const role = employee?.role ?? payload.employee?.role ?? 'N/A';
    const bank = employee?.bankAccountNumber ?? payload.employee?.bankAccountNumber ?? 'N/A';
    const pan = (employee?.pan ?? payload.employee?.pan ?? 'N/A').toString().toUpperCase();
    const pf = employee?.pfAccountNumber ?? payload.employee?.pfAccountNumber ?? 'N/A';
    const daysPresent = Math.round(((employee?.attendancePercentage ?? payload.attendancePercentage ?? 0) / 100) * 30);
    const remarks = payload.remarks ?? employee?.remarks ?? '-';

    const fmt = (n?: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

    return `
 PAYSLIP — ${monthLabel}

 Company: Lomaa IT Solutions

 Employee Name: ${empName}
 Employee ID: ${empId}
 Department: ${dept}
 Designation: ${role}

 Bank Account: ${bank}
 PAN: ${pan}
 PF No: ${pf}

 Days Present: ${daysPresent} days

------------------------------
 Earnings
• Basic Salary: ${fmt(payload.earnings.basic)}
• HRA: ${fmt(payload.earnings.hra)}
• DA: ${fmt(payload.earnings.da)}
• Special Allowance: ${fmt(payload.earnings.specialAllowance)}
 Gross Earnings: ${fmt(payload.earnings.gross)}

------------------------------
 Deductions
• PF (12%): ${fmt(payload.deductions.pf)}
• ESI (0.75%): ${fmt(payload.deductions.esi)}
• Professional Tax: ${fmt(payload.deductions.pt)}
• TDS: ${fmt(payload.deductions.tax)}
 Total Deductions: ${fmt(payload.deductions.totalDeductions)}

------------------------------
 NET PAY: ${fmt(payload.netSalary)}

 HR Remarks: ${remarks}

 This is a system-generated payslip.
  `.trim();
  };


  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(getShareText())}`;
  const mailtoUrl = `mailto:${employee?.email ?? ''}?subject=${encodeURIComponent(`Payslip for ${employee?.name ?? ''}`)}&body=${encodeURIComponent(getShareText())}`;

  async function downloadPdfFromServer() {
    if (!payslipId) return alert('Payslip id missing');
    setDownloading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/payroll/pdf-html/${encodeURIComponent(payslipId)}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // If server returned a non-OK status, try to read error text/json and show it
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let bodyText = '';
        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          bodyText = json ? (json.message || JSON.stringify(json)) : await res.text().catch(() => '');
        } else {
          bodyText = await res.text().catch(() => '');
        }
        throw new Error(bodyText || `PDF generation failed (${res.status})`);
      }

      // Ensure we read as binary
      const ab = await res.arrayBuffer();
      if (!ab || ab.byteLength === 0) throw new Error('Empty response from server');

      // Quick magic-bytes check for `%PDF-`
      const header = new Uint8Array(ab.slice(0, 5));
      const headerStr = String.fromCharCode(...header);
      if (!headerStr.startsWith('%PDF')) {
        // It isn't a PDF — convert to text and show helpful message
        const text = new TextDecoder().decode(ab);
        console.error('Server returned non-PDF body:', text);
        throw new Error('Server returned non-PDF data. Check server logs or SMTP config.');
      }

      const blob = new Blob([ab], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const safeMonth = (payload.month ?? 'month').toString().replace('/', '-');
      const fileName = `payslip-${payload.employeeId ?? 'emp'}-${safeMonth}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatusMsg('Downloaded!');
    } catch (err: any) {
      console.error('Download PDF failed', err);
      alert(err?.message || 'Failed to download PDF. Check server logs.');
    } finally {
      setDownloading(false);
      setTimeout(() => setStatusMsg(''), 3000);
    }
  }


  const generatePDF = async (): Promise<Blob | null> => {
    const element = document.getElementById('printable-area');
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF Generation failed', error);
      return null;
    }
  };

  const fallbackShare = (action: 'WHATSAPP' | 'EMAIL', fileName: string, pdfBlob: Blob) => {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const text = `Please find the attached payslip for ${employee?.name ?? payload.employeeName ?? ''}.`;
    let appUrl = '';
    if (action === 'WHATSAPP') {
      appUrl = `https://wa.me/?text=${encodeURIComponent(text + " (PDF Downloaded)")}`;
    } else {
      appUrl = `mailto:${employee?.email ?? ''}?subject=${encodeURIComponent(`Payslip for ${employee?.name ?? ''}`)}&body=${encodeURIComponent(text)}`;
    }
    window.open(appUrl, '_blank');
    setStatusMsg('PDF Downloaded. Please attach to message.');
  };

  const handleAction = async (action: 'WHATSAPP' | 'EMAIL' | 'DOWNLOAD') => {
    setIsGenerating(true);
    setStatusMsg(action === 'DOWNLOAD' ? 'Preparing download...' : 'Processing...');

    // allow UI to update
    await new Promise(resolve => setTimeout(resolve, 120));

    if (action === 'DOWNLOAD') {
      if (payslipId) {
        try {
          await downloadPdfFromServer();
          setStatusMsg('Downloaded!');
        } catch (err) {
          const pdfBlob = await generatePDF();
          if (pdfBlob) {
            const fileName = `Payslip_${(employee?.name ?? payload.employeeName ?? 'employee').toString().replace(/\s+/g, '_')}_${(payload.month ?? 'month').toString().replace('/', '-')}.pdf`;
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            setStatusMsg('Downloaded (client fallback)');
          } else {
            setStatusMsg('Failed to download');
          }
        } finally {
          setIsGenerating(false);
          setTimeout(() => setStatusMsg(''), 3000);
        }
        return;
      } else {
        // no payslipId - generate locally
        const pdfBlob = await generatePDF();
        if (!pdfBlob) {
          setIsGenerating(false);
          setStatusMsg('Failed to generate PDF');
          setTimeout(() => setStatusMsg(''), 3000);
          return;
        }
        const fileName = `Payslip_${(employee?.name ?? payload.employeeName ?? 'employee').toString().replace(/\s+/g, '_')}_${(payload.month ?? 'month').toString().replace('/', '-')}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsGenerating(false);
        setStatusMsg('Downloaded!');
        setTimeout(() => setStatusMsg(''), 3000);
        return;
      }
    }

    if (action === 'EMAIL') {
      const defaultTo = employee?.email ?? '';
      const to = defaultTo ?? prompt('Send payslip to (email):', '') ?? '';
      if (!to) {
        setIsGenerating(false);
        setStatusMsg('');
        return;
      }

      if (payslipId) {
        try {
          setStatusMsg('Requesting server to send email...');
          const token = getToken();
          const res = await fetch(`${API_BASE}/payroll/email-html/${encodeURIComponent(payslipId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ to })
          });


          const contentType = res.headers.get('content-type') || '';
          if (res.ok) {
            if (contentType.includes('application/json')) {
              const json = await res.json().catch(() => ({ message: 'Email request sent' }));
              setStatusMsg(json.message || 'Email queued/sent (server)');
            } else {
              setStatusMsg('Email request sent (server responded with non-JSON).');
            }
            setIsGenerating(false);
            setTimeout(() => setStatusMsg(''), 4000);
            return;
          } else {
            let errMsg = `Server error (${res.status})`;
            if (contentType.includes('application/json')) {
              const errJson = await res.json().catch(() => null);
              if (errJson) errMsg = errJson.message || JSON.stringify(errJson);
            } else {
              const text = await res.text().catch(() => '');
              if (text) errMsg = text;
            }
            console.warn('Server email failed:', errMsg);
            setStatusMsg('Server email failed, falling back to manual attach: ' + (errMsg.slice ? errMsg.slice(0, 120) : errMsg));
          }
        } catch (err: any) {
          console.error('Server email request failed', err);
          setStatusMsg('Server email failed — falling back to manual attach');
        }
      }

      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        setIsGenerating(false);
        setStatusMsg('Failed to generate PDF for fallback');
        setTimeout(() => setStatusMsg(''), 3000);
        return;
      }
      const fileName = `Payslip_${(employee?.name ?? payload.employeeName ?? 'employee').toString().replace(/\s+/g, '_')}_${(payload.month ?? 'month').toString().replace('/', '-')}.pdf`;
      fallbackShare('EMAIL', fileName, pdfBlob);

      setIsGenerating(false);
      setTimeout(() => setStatusMsg(''), 4000);
      return;
    }

    if (action === 'WHATSAPP') {
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        window.open(whatsappUrl, '_blank');
        setIsGenerating(false);
        setStatusMsg('Opened WhatsApp (text) — image unavailable');
        setTimeout(() => setStatusMsg(''), 3000);
        return;
      }

      const fileName = `Payslip_${(employee?.name ?? payload.employeeName ?? 'employee').toString().replace(/\s+/g, '_')}_${(payload.month ?? 'month').toString().replace('/', '-')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        try {
          await (navigator as any).share({
            files: [file],
            title: 'Payslip',
            text: `Payslip for ${employee?.name ?? payload.employeeName ?? ''} - ${monthLabel}`
          });
          setStatusMsg('Shared successfully');
        } catch (error) {
          console.log('Share cancelled or failed', error);
          fallbackShare('WHATSAPP', fileName, pdfBlob);
        }
      } else {
        fallbackShare('WHATSAPP', fileName, pdfBlob);
      }

      setIsGenerating(false);
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  // async function sendPayslipEmail() {
  //   try {
  //     if (!payslipId) return alert('Payslip id missing');
  //     const to = employee?.email ?? prompt('Send payslip to (email):', '') ?? '';
  //     if (!to) return;
  //     setSending(true);
  //     const token = getToken();
  //     const res = await fetch(`${API_BASE}/payroll/email/${encodeURIComponent(payslipId)}`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         ...(token ? { Authorization: `Bearer ${token}` } : {})
  //       },
  //       body: JSON.stringify({ to })
  //     });
  //     if (!res.ok) {
  //       const txt = await res.text().catch(() => '');
  //       throw new Error(txt || `Email send failed (${res.status})`);
  //     }
  //     alert('Email request sent. (If SMTP configured, employee will receive mail.)');
  //   } catch (err: any) {
  //     console.error('Email failed', err);
  //     alert(err?.message ?? 'Failed to send email');
  //   } finally {
  //     setSending(false);
  //   }
  // }


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
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center flex-col gap-2">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="font-semibold text-slate-700">{statusMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">Loading payslip…</div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 max-w-2xl mx-auto" id="printable-area">
              <div className="text-center border-b border-slate-200 pb-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-lg">
                    <div className="relative w-10 h-10">

                      <img
                        src="/logo.png"
                        alt="Company Logo"
                        className="absolute inset-0 w-full h-full object-contain rounded-full"
                      />

                      {/* <>
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                          L
                        </span>
                        <Leaf className="absolute -top-1 -right-1 text-emerald-500 w-3 h-3 fill-emerald-500" />
                      </> */}

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
                  <span className="font-semibold text-slate-700">{Math.round(((employee.attendancePercentage ?? payload.attendancePercentage ?? 0) / 100) * 30)} days</span>
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

        <div className="p-6 bg-white border-t border-slate-200 flex gap-4 justify-center shrink-0">
          <button
            onClick={() => handleAction('WHATSAPP')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Share2 size={18} /> WhatsApp PDF
          </button>

          <button
            onClick={() => handleAction('EMAIL')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Mail size={18} /> Email PDF
          </button>

          <button
            onClick={() => handleAction('DOWNLOAD')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Download size={18} /> Download (PDF)
          </button>

          {/* <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
            <Share2 size={18} /> WhatsApp
          </a>

          <a href={mailtoUrl} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
            <Mail size={18} /> Email
          </a>

          <button onClick={downloadPdfFromServer} disabled={downloading} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60">
            <Download size={18} /> {downloading ? 'Preparing...' : 'Download (PDF)'}
          </button> */}

          {/* <button onClick={sendPayslipEmail} disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-60">
            <Mail size={18} /> {sending ? 'Sending…' : 'Send Email'}
          </button> */}

          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors">
            <Download size={18} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
