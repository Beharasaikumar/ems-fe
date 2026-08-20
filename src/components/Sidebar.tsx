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
  X,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
   user: {
    role: 'ADMIN' | 'EMPLOYEE';
  };
  pendingLeaveCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, user, pendingLeaveCount = 0, isOpen = false, onClose }) => {
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
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 border-b border-slate-800 flex flex-col items-center gap-3 relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
             <div className="relative w-[200px] h-[50px] rounded-full">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
              <p className='text-xs max-w-[150px]'>Employee Management <span className="flex justify-center items-center"> System</span></p>
         </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => { setView(item.view); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${currentView === item.view
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className={`${currentView === item.view ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}>
                {item.icon}
              </span>
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.view === 'LEAVES' && user.role === 'ADMIN' && pendingLeaveCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold">
                  {pendingLeaveCount}
                </span>
              )}
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
    </>
  );
};
