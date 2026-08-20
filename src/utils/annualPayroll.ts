import { Employee, Payslip } from '../types';
import { PF_RATE, ESI_EMPLOYEE_RATE, ESI_WAGE_LIMIT, PROFESSIONAL_TAX } from '../constants';

const PT_THRESHOLD = 15000;
const TDS_THRESHOLD = 25000;
const TDS_RATE = 0.1;

export type FlatAttendanceRecord = { id?: string; employeeId: string; date: string; status: string };

export type FYMonth = { year: number; monthIndex: number };

export type FYOption = { startYear: number; label: string; isCurrent: boolean };

export type MergedEarnings = { basic: number; hra: number; special: number; gross: number };

export type ComputedDeductions = {
  pf: number;
  esi: number;
  pt: number;
  tax: number;
  advance: number;
  totalDeductions: number;
};

export type ComputedMonth = {
  paidDays: number;
  totalDays: number;
  earnings: MergedEarnings;
  deductions: ComputedDeductions;
  netSalary: number;
};

export const formatINR = (n?: number) => `₹${Math.round(n ?? 0).toLocaleString('en-IN')}`;

export const monthLabel = (m: FYMonth) =>
  new Date(m.year, m.monthIndex).toLocaleString('default', { month: 'short', year: 'numeric' });

export const monthPrefix = (m: FYMonth) => `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}`;

/** FY runs Apr(startYear) -> Mar(startYear+1). Returns the FY start year for "today". */
export function currentFYStartYear(today: Date = new Date()): number {
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

export function getFinancialYearMonths(startYear: number): FYMonth[] {
  const months: FYMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, 3 + i, 1);
    months.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }
  return months;
}

export function getFinancialYearOptions(employees: Employee[]): FYOption[] {
  const nowFY = currentFYStartYear();

  // Always offer the current FY plus the previous 9, regardless of employee join dates —
  // admins may need to generate documents for older years (audits, re-issues, etc).
  const lowerBound = nowFY - 9;
  const options: FYOption[] = [];
  for (let sy = nowFY; sy >= lowerBound; sy--) {
    options.push({ startYear: sy, label: `FY ${sy} - ${sy + 1}`, isCurrent: sy === nowFY });
  }
  return options;
}

export function isMonthBeforeJoin(emp: Employee, m: FYMonth): boolean {
  if (!emp.joinDate) return false;
  const join = new Date(emp.joinDate);
  if (isNaN(join.getTime())) return false;
  const monthEnd = new Date(m.year, m.monthIndex + 1, 0);
  return join > monthEnd;
}

/** True once the month hasn't started yet relative to today — nothing to project or pay out. */
export function isMonthInFuture(m: FYMonth, today: Date = new Date()): boolean {
  const monthStart = new Date(m.year, m.monthIndex, 1);
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return monthStart > todayMonthStart;
}

export function countPaidDays(attendanceForMonth: FlatAttendanceRecord[], totalDays: number): number {
  if (!attendanceForMonth || attendanceForMonth.length === 0) return totalDays;
  let paid = 0;
  attendanceForMonth.forEach(r => {
    if (r.status === 'Present') paid += 1;
    else if (r.status === 'Leave') paid += 1;
    else if (r.status === 'Half Day') paid += 0.5;
  });
  return Math.min(paid, totalDays);
}

function pfFor(emp: Employee, basic: number): number {
  return emp.pfEnabled !== false ? Math.round(basic * PF_RATE) : 0;
}

function esiFor(emp: Employee, gross: number): number {
  const grossForEsi = emp.monthlyGrossSalary ?? gross;
  return emp.esiEnabled !== false && grossForEsi <= ESI_WAGE_LIMIT
    ? Math.ceil(gross * ESI_EMPLOYEE_RATE)
    : 0;
}

function ptFor(gross: number): number {
  return gross > PT_THRESHOLD ? PROFESSIONAL_TAX : 0;
}

function taxFor(gross: number): number {
  return gross > TDS_THRESHOLD ? Math.round((gross - TDS_THRESHOLD) * TDS_RATE) : 0;
}

/** Fixed/unprorated monthly structure — used for CTC-style annual figures & the certificate. */
export function calculateFixedMonthly(emp: Employee): ComputedMonth {
  const basic = emp.basicSalary ?? 0;
  const hra = emp.hra ?? 0;
  const special = (emp.specialAllowance ?? 0) + (emp.da ?? 0);
  const gross = basic + hra + special;

  const pf = pfFor(emp, basic);
  const esi = esiFor(emp, gross);
  const pt = ptFor(gross);
  const tax = taxFor(gross);
  const totalDeductions = pf + esi + pt + tax;

  return {
    paidDays: 0,
    totalDays: 0,
    earnings: { basic, hra, special, gross },
    deductions: { pf, esi, pt, tax, advance: 0, totalDeductions },
    netSalary: gross - totalDeductions,
  };
}

/** Attendance-prorated projection for a month with no saved payslip yet. */
export function calculateHistoricalPayroll(
  emp: Employee,
  m: FYMonth,
  attendanceForMonth: FlatAttendanceRecord[],
  advanceAmount: number = 0
): ComputedMonth {
  const totalDays = new Date(m.year, m.monthIndex + 1, 0).getDate();
  const paidDays = countPaidDays(attendanceForMonth, totalDays);

  const calc = (amount: number) => Math.round((amount / totalDays) * paidDays);

  const earnedBasic = calc(emp.basicSalary ?? 0);
  const earnedHra = calc(emp.hra ?? 0);
  const earnedDa = calc(emp.da ?? 0);
  const earnedSpecial = calc(emp.specialAllowance ?? 0) + earnedDa;
  const earnedGross = earnedBasic + earnedHra + earnedSpecial;

  const pf = pfFor(emp, earnedBasic);
  const esi = esiFor(emp, earnedGross);
  const pt = ptFor(earnedGross);
  const tax = taxFor(earnedGross);
  const totalDeductions = pf + esi + pt + tax + advanceAmount;

  return {
    paidDays,
    totalDays,
    earnings: { basic: earnedBasic, hra: earnedHra, special: earnedSpecial, gross: earnedGross },
    deductions: { pf, esi, pt, tax, advance: advanceAmount, totalDeductions },
    netSalary: earnedGross - totalDeductions,
  };
}

/** Folds a real saved payslip's DA into Special Allowance for display, keeping its real (possibly prorated) figures. */
export function mergeEarningsForDisplay(earnings: {
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  gross: number;
}): MergedEarnings {
  return {
    basic: earnings.basic ?? 0,
    hra: earnings.hra ?? 0,
    special: (earnings.specialAllowance ?? 0) + (earnings.da ?? 0),
    gross: earnings.gross ?? 0,
  };
}

export function findSavedPayslip(history: Payslip[], m: FYMonth): Payslip | undefined {
  const prefix = monthPrefix(m);
  return history.find(p => p.month === prefix);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ' ' + ONES[o] : ''}`;
}

function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h ? ONES[h] + ' Hundred' : ''}${h && rest ? ' ' : ''}${rest ? twoDigitWords(rest) : ''}`;
}

/** Converts a rupee amount to words using the Indian (Lakh/Crore) numbering system. */
export function amountInWordsINR(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));

  return `${parts.join(' ')} Rupees Only`;
}
