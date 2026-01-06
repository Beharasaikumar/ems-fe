import React from 'react';
import { ViewState } from '../types';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  IndianRupee,
  LogOut,
  CheckSquare,
  CalendarDays,
  StickyNote,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
   user: {
    role: 'ADMIN' | 'EMPLOYEE';
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, user }) => {
  if (!user) return null;
  const adminNavItems: { view: ViewState; label: string; icon: React.ReactNode }[] = [
    { view: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { view: 'EMPLOYEES', label: 'Employees', icon: <Users size={20} /> },
    { view: 'ATTENDANCE', label: 'Attendance', icon: <CalendarCheck size={20} /> },
    { view: 'PAYROLL', label: 'Payroll', icon: <IndianRupee size={20} /> },
    { view: 'BILLS', label: 'Bill Management', icon: <IndianRupee size={20} /> },
    { view: 'LEAVES', label: 'Leave Management', icon: <CheckSquare size={20} />},
    { view: 'DAILY_LOGS', label: 'Daily Logs', icon: <StickyNote /> },
  ];

  const employeeNavItems: { view: ViewState; label: string; icon: React.ReactNode }[] = [
  { view: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { view: 'ATTENDANCE', label: 'Attendance', icon: <CalendarCheck size={20} /> },
  { view: 'PAYROLL', label: 'Payroll', icon: <IndianRupee size={20} /> },
  { view: 'LEAVES', label: 'Leave Request', icon: <CalendarDays size={20} /> },
];

  const navItems =
    user.role === 'ADMIN' ? adminNavItems : employeeNavItems;

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-20">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center gap-3">
           <div className="relative w-[200px] h-[50px] rounded-full">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>  
            <p className='text-xs max-w-[150px]'>Employee Management <span className="flex justify-center items-center"> System</span></p>
       </div>
  
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${currentView === item.view
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <span className={`${currentView === item.view ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};