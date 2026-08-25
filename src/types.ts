export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
  pan: string;
  department: string;

  // Salary Structure
  monthlyGrossSalary: number;

  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;

  // Banking & Statutory
  bankAccountNumber?: string;
  pfAccountNumber?: string;
  esiNumber?: string;
  esiEnabled?: boolean;
  pfEnabled?: boolean;

  // sickleave: number;
  // casualleave: number;
  // paidleave: number;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  effectiveDate: string; // YYYY-MM-DD
  monthlyGrossSalary: number;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  reason?: string;
  createdAt?: string;
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  HALF_DAY = 'Half Day',
  LEAVE = 'Leave'
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface EmployeeAttendance {
  employeeId: string;
  records: AttendanceRecord[];
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  year: number;
  generatedDate: string;
  attendancePercentage: number;
  earnings: {
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    gross: number;
  };
  deductions: {
    pf: number;
    esi: number;
    pt: number;
    tax: number;
    advance?: number;
    totalDeductions: number;
  };
  netSalary: number;
  remarks?: string; 
}

export type Bill = {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: 'Pending' | 'Paid' | 'Rejected';
  billDate: string;
  fileName?: string;
  fileData?: string;
  createdAt: string;
  updatedAt: string;
};

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'Sick' | 'Casual' | 'Paid';
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
  decidedOn?: string;
}

export interface AdminNote {
  id: string;
  title: string;
  content: string;
  category: 'Note' | 'Report' | 'Update' | 'Reminder';
  isPinned: boolean;
  createdAt: string;
}


export type ViewState = 'DASHBOARD' | 'EMPLOYEES' | 'ATTENDANCE' | 'PAYROLL' | 'BILLS' | 'LEAVES' | 'DAILY_LOGS';

