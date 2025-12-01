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
  basicSalary: number; // Monthly Basic in INR
  hra: number;         // House Rent Allowance
  da: number;          // Dearness Allowance
  specialAllowance: number;
  
  // Banking & Statutory
  bankAccountNumber?: string;
  pfAccountNumber?: string;
  esiNumber?: string;
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
    pf: number; // Provident Fund (12% of Basic)
    esi: number; // Employee State Insurance (0.75% of Gross if < 21k)
    pt: number; // Professional Tax (Standard ~200)
    tax: number; // Income Tax (TDS) - simplified
    totalDeductions: number;
  };
  netSalary: number;
  remarks?: string; // AI Generated remark
}

export type ViewState = 'DASHBOARD' | 'EMPLOYEES' | 'ATTENDANCE' | 'PAYROLL';