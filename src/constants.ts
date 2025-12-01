import { Employee, AttendanceStatus } from './types';

export const PF_RATE = 0.12;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_WAGE_LIMIT = 21000;
export const PROFESSIONAL_TAX = 200;

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Rajesh Kumar',
    email: 'rajesh.k@example.com',
    phone: '+919876543210',
    role: 'Senior Developer',
    department: 'Engineering',
    joinDate: '2022-03-15',
    pan: 'ABCDE1234F',
    basicSalary: 45000,
    hra: 18000,
    da: 4500,
    specialAllowance: 5000,
    bankAccountNumber: '987654321012',
    pfAccountNumber: 'MH/BAN/0012345/000/001',
  },
  {
    id: 'EMP002',
    name: 'Priya Sharma',
    email: 'priya.s@example.com',
    phone: '+919876543211',
    role: 'HR Executive',
    department: 'Human Resources',
    joinDate: '2023-01-10',
    pan: 'FGHIJ5678K',
    basicSalary: 25000,
    hra: 10000,
    da: 2500,
    specialAllowance: 1500,
    bankAccountNumber: '123456789012',
    pfAccountNumber: 'MH/BAN/0012345/000/002',
  },
  {
    id: 'EMP003',
    name: 'Amit Patel',
    email: 'amit.p@example.com',
    phone: '+919876543212',
    role: 'Sales Manager',
    department: 'Sales',
    joinDate: '2021-06-01',
    pan: 'LMNOP9012Q',
    basicSalary: 35000,
    hra: 14000,
    da: 3500,
    specialAllowance: 3000,
    bankAccountNumber: '567890123456',
    pfAccountNumber: 'MH/BAN/0012345/000/003',
  },
  {
    id: 'EMP004',
    name: 'Sneha Gupta',
    email: 'sneha.g@example.com',
    phone: '+919876543213',
    role: 'UI/UX Designer',
    department: 'Design',
    joinDate: '2023-08-20',
    pan: 'RSTUV3456W',
    basicSalary: 28000,
    hra: 11200,
    da: 2800,
    specialAllowance: 2000,
    bankAccountNumber: '345678901234',
    pfAccountNumber: 'MH/BAN/0012345/000/004',
  },
  {
    id: 'EMP005',
    name: 'Vikram Singh',
    email: 'vikram.s@example.com',
    phone: '+919876543214',
    role: 'Intern',
    department: 'Engineering',
    joinDate: '2024-01-05',
    pan: 'XYZAB7890C',
    basicSalary: 12000,
    hra: 4800,
    da: 1200,
    specialAllowance: 0,
    bankAccountNumber: '901234567890',
  }
];

// Helper to generate some dummy attendance for the current month
export const generateMockAttendance = (empId: string): { employeeId: string, records: any[] } => {
  const records = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dayOfWeek = date.getDay();
    let status = AttendanceStatus.PRESENT;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = AttendanceStatus.LEAVE; // Weekend
    } else if (Math.random() > 0.9) {
      status = AttendanceStatus.ABSENT;
    } else if (Math.random() > 0.95) {
      status = AttendanceStatus.HALF_DAY;
    }

    records.push({
      date: date.toISOString().split('T')[0],
      status
    });
  }
  return { employeeId: empId, records };
};