import React, { useMemo, useState } from 'react';
import {
  Award, X, Download, Printer, Share2, Copy, Check, ChevronDown, ChevronUp,
  RotateCcw, Settings2, Mail,
  Phone, Globe,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Employee } from '../types';
import { formatINR } from '../utils/annualPayroll';

interface ExperienceCertificateModalProps {
  employee: Employee;
  onClose: () => void;
}

type CertType = 'RELIEVED' | 'CURRENT';
type Conduct = 'Exemplary' | 'Excellent' | 'Very Good' | 'Good';

const CONDUCT_OPTIONS: Conduct[] = ['Exemplary', 'Excellent', 'Very Good', 'Good'];
const CONDUCT_LABELS: Record<Conduct, string> = {
  Exemplary: 'Exemplary (Highest Merit)',
  Excellent: 'Excellent (Highly Commendable)',
  'Very Good': 'Very Good (Commendable)',
  Good: 'Good (Satisfactory)',
};

const CERT_TYPE_LABELS: Record<CertType, string> = {
  RELIEVED: 'Experience & Relieving Certificate (Completed Service)',
  CURRENT: 'Bonafide Experience Certificate (Currently Employed)',
};

const FIELD_INPUT_CLASS = 'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors';
const FIELD_SELECT_CLASS = `${FIELD_INPUT_CLASS} appearance-none pr-9 cursor-pointer`;

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <div className={className}>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const FieldSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }> = ({ label, value, onChange, options, className }) => (
  <Field label={label} className={className}>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={FIELD_SELECT_CLASS}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  </Field>
);

const ACCENT_BAR_COLORS = ['#d6df2e', '#c3df3c', '#a8d84d', '#93d05c', '#7ec168', '#5a9c4c'];

const AccentGradientBar: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex h-2 overflow-hidden ${className || ''}`}>
    {ACCENT_BAR_COLORS.map((color) => (
      <div key={color} className="flex-1" style={{ backgroundColor: color }} />
    ))}
  </div>
);

const todayStr = () => new Date().toISOString().slice(0, 10);

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function formatFormalIndianDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return `${ordinal(d.getDate())} ${d.toLocaleString('en-IN', { month: 'long' })}, ${d.getFullYear()}`;
}

function calculateTenure(startStr?: string, endStr?: string): string {
  if (!startStr) return 'N/A';
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 'N/A';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

function defaultResponsibilities(role?: string, department?: string): string {
  const text = `${role || ''} ${department || ''}`.toLowerCase();
  if (/engineer|develop|software|program/.test(text)) {
    return 'Responsible for designing, developing, and maintaining software applications, writing clean and efficient code, participating in code reviews, and collaborating with cross-functional teams to deliver scalable technical solutions aligned with business requirements.';
  }
  if (/design|ui|ux/.test(text)) {
    return 'Responsible for creating user-centric interface and experience designs, conducting user research, building wireframes and prototypes, and collaborating with product and engineering teams to deliver intuitive, visually consistent digital experiences.';
  }
  if (/qa|test|quality/.test(text)) {
    return 'Responsible for planning and executing test strategies, identifying and documenting defects, performing manual and automated testing, and ensuring the quality, reliability, and performance of software releases prior to deployment.';
  }
  return 'Responsible for core project operations, cross-functional collaboration, technical requirement analysis, and executing high-priority deliverables aligned with business goals.';
}

export const ExperienceCertificateModal: React.FC<ExperienceCertificateModalProps> = ({ employee, onClose }) => {
  const [certType, setCertType] = useState<CertType>('CURRENT');
  const [issueDate, setIssueDate] = useState(todayStr());
  const [relievingDate, setRelievingDate] = useState(todayStr());
  const [designation, setDesignation] = useState(employee.role || '');
  const [department, setDepartment] = useState(employee.department || '');
  const [conduct, setConduct] = useState<Conduct>('Exemplary');
  const [responsibilities, setResponsibilities] = useState(() => defaultResponsibilities(employee.role, employee.department));
  const [includeSalary, setIncludeSalary] = useState(false);
  const [noDuesCleared, setNoDuesCleared] = useState(true);
  const [signatoryName, setSignatoryName] = useState('D. Lavanya');
  const [signatoryRole, setSignatoryRole] = useState('Director');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRelieved = certType === 'RELIEVED';

  const currentYear = new Date().getFullYear();
  const certNumber = `LIT/EXP/${currentYear}/${employee.id}`;
  const effectiveEndDate = isRelieved ? relievingDate : todayStr();

  const tenure = useMemo(() => calculateTenure(employee.joinDate, effectiveEndDate), [employee.joinDate, effectiveEndDate]);
  const formattedJoinDate = useMemo(() => formatFormalIndianDate(employee.joinDate), [employee.joinDate]);
  const formattedEndDate = useMemo(() => formatFormalIndianDate(effectiveEndDate), [effectiveEndDate]);
  const formattedIssueDate = useMemo(() => formatFormalIndianDate(issueDate), [issueDate]);

  const title = isRelieved ? 'Experience & Relieving Certificate' : 'Work Experience & Bonafide Service Certificate';
  const docKind = isRelieved ? 'Experience' : 'Service';
  const separationStatus = isRelieved ? 'Relieved in Good Standing' : 'Currently in Active Service';

  const declarationText = isRelieved
    ? <>This is to certify that <strong>{employee.name}</strong> (Employee ID: <strong>{employee.id}</strong>), holding PAN <strong>{employee.pan || 'N/A'}</strong>, was employed as a full-time employee with Lomaa IT Solutions from <strong>{formattedJoinDate}</strong> to <strong>{formattedEndDate}</strong>.</>
    : <>This is to certify that <strong>{employee.name}</strong> (Employee ID: <strong>{employee.id}</strong>), holding PAN <strong>{employee.pan || 'N/A'}</strong>, has been employed as a full-time employee with Lomaa IT Solutions since <strong>{formattedJoinDate}</strong>, and is currently working with the organization in good standing.</>;

  const conductText = <>During their period of employment with Lomaa IT Solutions, we found them to be sincere, diligent, hardworking, and professionally dedicated. They exhibited high ethical standards, dependable teamwork, and technical competence in all assignments entrusted to them. Their conduct and character were certified as <strong>{conduct}</strong> throughout their tenure.</>;

  const noDuesText = <><strong>Asset Clearance &amp; Full &amp; Final Settlement:</strong> The employee has formally completed all handover processes, surrendered company assets and access credentials, and completed full-and-final settlement. There are zero outstanding dues or liabilities pending against them.</>;

  const salaryText = <><strong>Compensation on Record:</strong> As per official payroll records, the employee's last drawn monthly gross compensation was <strong>{formatINR(employee.monthlyGrossSalary)}</strong>, comprising Basic Salary of {formatINR(employee.basicSalary)}, House Rent Allowance of {formatINR(employee.hra)}, and Special Allowance of {formatINR(employee.specialAllowance)}.</>;

  const closingText = isRelieved
    ? `We appreciate their valuable contributions to Lomaa IT Solutions and wish them all the best, personal fulfillment, and continued success in their future career endeavors.`
    : `We appreciate their valuable contributions to Lomaa IT Solutions and look forward to their continued growth and success within the organization.`;

  function resetResponsibilities() {
    setResponsibilities(defaultResponsibilities(employee.role, employee.department));
  }

  function buildPlainText(): string {
    const lines: string[] = [];
    lines.push('LOMAA IT SOLUTIONS');
    lines.push('Enterprise Software & IT Consulting Services');
    lines.push('Tech Park, IT SEZ, Hill No. 2, Visakhapatnam, AP - 530045');
    lines.push('GSTIN: 37AAACL1234F1Z5  |  CIN: U72200AP2020PTC123456');
    lines.push('');
    lines.push(`Ref. No: ${certNumber}`);
    lines.push(`Date of Issue: ${formattedIssueDate}`);
    lines.push('');
    lines.push(title.toUpperCase());
    lines.push(`Employment Tenure: ${tenure}`);
    lines.push('');
    lines.push('TO WHOMSOEVER IT MAY CONCERN');
    lines.push('');
    lines.push(isRelieved
      ? `This is to certify that ${employee.name} (Employee ID: ${employee.id}), holding PAN ${employee.pan || 'N/A'}, was employed as a full-time employee with Lomaa IT Solutions from ${formattedJoinDate} to ${formattedEndDate}.`
      : `This is to certify that ${employee.name} (Employee ID: ${employee.id}), holding PAN ${employee.pan || 'N/A'}, has been employed as a full-time employee with Lomaa IT Solutions since ${formattedJoinDate}, and is currently working with the organization in good standing.`);
    lines.push('');
    lines.push(`Designation: ${designation || 'N/A'}`);
    lines.push(`Department: ${department || 'N/A'}`);
    lines.push(`Total Service Tenure: ${tenure}`);
    lines.push(`Separation Status: ${separationStatus}`);
    lines.push('');
    lines.push('KEY ROLES & PROFESSIONAL RESPONSIBILITIES');
    lines.push(responsibilities);
    lines.push('');
    lines.push(`During their period of employment with Lomaa IT Solutions, we found them to be sincere, diligent, hardworking, and professionally dedicated. They exhibited high ethical standards, dependable teamwork, and technical competence in all assignments entrusted to them. Their conduct and character were certified as ${conduct} throughout their tenure.`);
    if (isRelieved && noDuesCleared) {
      lines.push('');
      lines.push('Asset Clearance & Full & Final Settlement: The employee has formally completed all handover processes, surrendered company assets and access credentials, and completed full-and-final settlement. There are zero outstanding dues or liabilities pending against them.');
    }
    if (includeSalary) {
      lines.push('');
      lines.push(`Compensation on Record: As per official payroll records, the employee's last drawn monthly gross compensation was ${formatINR(employee.monthlyGrossSalary)}, comprising Basic Salary of ${formatINR(employee.basicSalary)}, House Rent Allowance of ${formatINR(employee.hra)}, and Special Allowance of ${formatINR(employee.specialAllowance)}.`);
    }
    lines.push('');
    lines.push(closingText);
    lines.push('');
    lines.push('For Lomaa IT Solutions');
    lines.push('');
    lines.push('Authorized Signatory');
    lines.push(signatoryName);
    lines.push(signatoryRole);
    lines.push('');
    lines.push('System-Generated Document');
    lines.push(`Ref: ${certNumber} | Lomaa IT Solutions • Confidential`);
    return lines.join('\n');
  }

  function pdfFileName() {
    const safeName = (employee.name || employee.id).replace(/\s+/g, '_');
    return `${docKind}_Certificate_${safeName}_${employee.id}.pdf`;
  }

  async function renderPdf(): Promise<jsPDF | null> {
    const el = document.getElementById('experience-certificate-document');
    if (!el) return null;

    // Prevent Tailwind Preflight's `img { display: block }` from breaking html2canvas's
    // internal FontMetrics calculation, which shifts all text baselines downwards.
    const fixStyle = document.createElement('style');
    fixStyle.id = 'html2canvas-font-fix';
    fixStyle.textContent = 'img { display: inline-block !important; }';
    document.head.appendChild(fixStyle);

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 950,
        onclone: (clonedDoc) => {
          const cloneStyle = clonedDoc.createElement('style');
          cloneStyle.textContent = `
            img { display: inline-block !important; }
            #experience-certificate-document {
              width: 850px !important;
              max-width: 850px !important;
              min-width: 850px !important;
              margin: 0 auto !important;
              padding: 24px 32px !important;
              box-sizing: border-box !important;
            }
            #experience-certificate-document .mb-6 { margin-bottom: 12px !important; }
            #experience-certificate-document .mb-5 { margin-bottom: 10px !important; }
            #experience-certificate-document .pt-12 { padding-top: 18px !important; }
          `;
          clonedDoc.head.appendChild(cloneStyle);

          const clonedEl = clonedDoc.getElementById('experience-certificate-document');
          if (clonedEl) {
            clonedEl.style.width = '850px';
            clonedEl.style.maxWidth = '850px';
            clonedEl.style.minWidth = '850px';
            clonedEl.style.margin = '0 auto';
          }
          if (clonedDoc.body) {
            clonedDoc.body.style.width = '950px';
            clonedDoc.body.style.minWidth = '950px';
          }
        },
      });
    } finally {
      fixStyle.remove();
    }

    const flattened = document.createElement('canvas');
    flattened.width = canvas.width;
    flattened.height = canvas.height;
    const ctx = flattened.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, flattened.width, flattened.height);
      ctx.drawImage(canvas, 0, 0);
    }

    const imgData = flattened.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = 210;
    const pageHeight = 297;

    // Fill 98.5% of A4 page with minimal 2mm edge margin
    const margin = 2;
    const maxW = pageWidth - margin * 2; // 206mm (~98.1%)
    const maxH = pageHeight - margin * 2; // 293mm (~98.6%)

    const scaleW = maxW / flattened.width;
    const scaleH = maxH / flattened.height;

    const finalW = Math.min(maxW, flattened.width * scaleH);
    const finalH = maxH;

    const posX = (pageWidth - finalW) / 2;
    const posY = (pageHeight - finalH) / 2;

    pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH);
    return pdf;
  }

  function handlePrint() {
    const el = document.getElementById('experience-certificate-document');
    if (!el) return;

    let styles = '';
    const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleElements.forEach(tag => {
      styles += tag.outerHTML + '\n';
    });

    const iframe = document.createElement('iframe');
    iframe.id = 'exp-cert-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${employee.name}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          #experience-certificate-document {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${el.outerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error:', e);
      }
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 300);
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const pdf = await renderPdf();
      if (!pdf) return;
      pdf.save(pdfFileName());
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const pdf = await renderPdf();
      if (!pdf) return;
      const blob = pdf.output('blob');
      const fileName = pdfFileName();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: fileName, text: `${docKind} Certificate for ${employee.name}` });
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

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed', err);
      alert('Failed to copy certificate text.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent print:backdrop-blur-none print:block">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #experience-certificate-document,
          #experience-certificate-document * {
            visibility: visible !important;
          }
          #experience-certificate-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in-up print:animate-none print:shadow-none print:border-none print:rounded-none print:max-h-none print:overflow-visible print:block print:w-full print:max-w-none">
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 shrink-0 print:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2 flex-wrap">
                <Award size={18} className="text-emerald-400 shrink-0" />
                <span className="truncate">Experience &amp; Service Certificate</span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/50 border border-emerald-700 rounded-full px-2 py-0.5 whitespace-nowrap">{employee.id}</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 truncate">
                Official Certification for {employee.name} &bull; {designation || employee.role || 'N/A'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors shrink-0 sm:hidden">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDrawerOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${drawerOpen ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              <Settings2 size={14} /> {drawerOpen ? 'Hide Settings' : 'Customize Certificate'} {drawerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={copyText} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">
              <Printer size={14} /> Print
            </button>
            <button onClick={share} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              <Share2 size={14} /> Share
            </button>
            <button onClick={downloadPdf} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 transition-colors">
              <Download size={14} /> Download PDF
            </button>
            <button onClick={onClose} className="hidden sm:inline-flex p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {drawerOpen && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 shrink-0 max-h-[48vh] overflow-y-auto print:hidden">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isRelieved ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 mb-4`}>
              <FieldSelect
                label="Certificate Type"
                value={certType}
                onChange={v => setCertType(v as CertType)}
                options={(Object.keys(CERT_TYPE_LABELS) as CertType[]).map(t => ({ value: t, label: CERT_TYPE_LABELS[t] }))}
                className="sm:col-span-2"
              />

              <Field label="Date of Issuance">
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={FIELD_INPUT_CLASS} />
              </Field>

              {isRelieved && (
                <Field label="Last Working Day">
                  <input type="date" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} className={FIELD_INPUT_CLASS} />
                </Field>
              )}

              <FieldSelect
                label="Conduct & Character"
                value={conduct}
                onChange={v => setConduct(v as Conduct)}
                options={CONDUCT_OPTIONS.map(c => ({ value: c, label: CONDUCT_LABELS[c] }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <Field label="Designation / Role Title">
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className={FIELD_INPUT_CLASS} />
              </Field>

              <Field label="Department">
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className={FIELD_INPUT_CLASS} />
              </Field>

              <Field label="Authorized Signatory Name">
                <input type="text" value={signatoryName} onChange={e => setSignatoryName(e.target.value)} className={FIELD_INPUT_CLASS} />
              </Field>

              <Field label="Signatory Title">
                <input type="text" value={signatoryRole} onChange={e => setSignatoryRole(e.target.value)} className={FIELD_INPUT_CLASS} />
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Roles, Technical Responsibilities &amp; Key Contributions</label>
                <button onClick={resetResponsibilities} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 shrink-0">
                  <RotateCcw size={12} /> Reset to default
                </button>
              </div>
              <textarea
                value={responsibilities}
                onChange={e => setResponsibilities(e.target.value)}
                rows={2}
                className={`${FIELD_INPUT_CLASS} resize-y`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-slate-200">
              {isRelieved && (
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={noDuesCleared} onChange={e => setNoDuesCleared(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  Include No-Dues &amp; Asset Handover Clearance Clause
                </label>
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={includeSalary} onChange={e => setIncludeSalary(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                Include Last Drawn Compensation ({formatINR(employee.monthlyGrossSalary)}/mo)
              </label>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 overflow-y-auto overflow-x-auto bg-slate-50 flex-1 print:p-0 print:bg-white print:overflow-visible print:block">
          <div id="experience-certificate-document" className="relative bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-6 md:p-8 max-w-3xl mx-auto text-slate-800 print:border-none print:shadow-none print:rounded-none print:p-0 print:max-w-none print:w-full print:m-0">
            <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
              <img src="/watermark.png" alt="" className="w-80 h-80 object-contain opacity-[0.12]" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:items-start sm:text-left pb-5 border-b-2 border-green-300 mb-5 gap-4">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-3 min-w-0">
                  <img src="/logo_pay.png" alt="Lomaa IT Solutions" className="h-11 w-auto shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-lg leading-tight">LOMAA IT SOLUTIONS</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">GSTIN: 37AALFL9327Q1ZC</p>
                    <p className="text-[10px] text-slate-400 mt-1">1-118-24/2, 2nd floor, sector 12, near Ushodaya Junc., MVP, Visakhapatnam, AP - 530017</p>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-col items-center gap-1 sm:block sm:shrink-0 sm:text-right">
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 pt-1 pb-1 leading-none whitespace-nowrap">OFFICIAL CERTIFICATION</span>
                  <div className="text-[12px] text-slate-400 sm:mt-0.5 text-left whitespace-nowrap">
                    <Mail size={11} className="inline-block align-middle mr-1 text-slate-400" style={{ verticalAlign: '-1px' }} />
                    <span className="align-middle" style={{ fontFamily: "'Comfortaa', sans-serif" }}>hr@lomaait.com</span>
                  </div>
                  <div className="text-[12px] text-slate-400 text-left whitespace-nowrap">
                    <Phone size={11} className="inline-block align-middle mr-1 text-slate-400" style={{ verticalAlign: '-1px' }} />
                    <span className="align-middle">+91 94415 90527</span>
                  </div>
                  <div className="text-[12px] text-slate-400 text-left whitespace-nowrap">
                    <Globe size={11} className="inline-block align-middle mr-1 text-slate-400" style={{ verticalAlign: '-1px' }} />
                    <span className="align-middle" style={{ fontFamily: "'Comfortaa', sans-serif" }}>www.lomaait.com</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-slate-500 mb-6 break-all sm:break-normal">
                <span>Ref. No: <span className="font-semibold text-slate-700">{certNumber}</span></span>
                <span className="whitespace-nowrap">Date of Issue: <span className="font-semibold text-slate-700">{formattedIssueDate}</span></span>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-lg font-extrabold uppercase tracking-wide">{title}</h1>
                <div className="mt-2">
                  <span className="inline-block text-emerald-700 font-bold text-xs uppercase bg-emerald-50 border border-emerald-200 rounded-full px-3.5 pt-1 pb-1.5 leading-none">
                    Employment Tenure: {tenure}
                  </span>
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">To Whomsoever It May Concern</p>
              <p className="text-sm text-slate-700 leading-relaxed mb-6">{declarationText}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs">
                <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Designation</p><p className="font-semibold">{designation || 'N/A'}</p></div>
                <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Department</p><p className="font-semibold">{department || 'N/A'}</p></div>
                <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Total Service Tenure</p><p className="font-semibold text-emerald-700">{tenure}</p></div>
                <div><p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Separation Status</p><p className="font-semibold">{separationStatus}</p></div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Key Roles &amp; Professional Responsibilities
                </p>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-sm text-slate-700 leading-relaxed">
                  {responsibilities}
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-4">{conductText}</p>

              {isRelieved && noDuesCleared && (
                <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-lg p-3 mb-4 text-sm text-slate-700 leading-relaxed">
                  {noDuesText}
                </div>
              )}

              {includeSalary && (
                <p className="text-sm text-slate-700 leading-relaxed mb-4">{salaryText}</p>
              )}

              <p className="text-sm text-slate-700 leading-relaxed mb-8">{closingText}</p>

              <div className="flex justify-between items-end pt-4 border-t border-dashed border-slate-200">
                <div className="relative text-[10px] text-slate-400 max-w-[55%]">
                  <p className="text-[10px] text-slate-500">For Lomaa IT Solutions</p>

                  <img src="/stamp.png" alt="Lomaa IT Solutions Stamp" className="absolute left-0 top-2 w-28 h-28 object-contain opacity-70 -rotate-6 pointer-events-none select-none" />
                  <img src="/hrsign.png" alt="Authorized Signature" className="absolute left-0 top-2 w-36 h-auto object-contain pointer-events-none select-none" />

                  <p className="pt-12 text-[12px] text-slate-500 mt-1">Authorized Signatory</p>
                  <p className="text-[12px] text-slate-400">{signatoryName}</p>
                  <p className="text-[12px] text-slate-400">{signatoryRole}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-8 pt-4 border-t border-slate-200 text-[9px] text-slate-400">
                <span className="whitespace-nowrap">
                  Document Ref: <span className="font-semibold text-slate-500">{certNumber}</span>
                </span>
                <span className="whitespace-nowrap">System-Generated Document</span>
                <span className="whitespace-nowrap">Page 1 of 1</span>
                <span className="whitespace-nowrap">Lomaa IT Solutions • Confidential</span>
              </div>

              <AccentGradientBar className="mt-6 -mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 rounded-b-xl print:mx-0 print:mb-0 print:rounded-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceCertificateModal;
