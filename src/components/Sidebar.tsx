import React from 'react';
import { ViewState } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  LogOut,
  Leaf
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const navItems: { view: ViewState; label: string; icon: React.ReactNode }[] = [
    { view: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { view: 'EMPLOYEES', label: 'Employees', icon: <Users size={20} /> },
    { view: 'ATTENDANCE', label: 'Attendance', icon: <CalendarCheck size={20} /> },
    { view: 'PAYROLL', label: 'Payroll', icon: <IndianRupee size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-20">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
           <div className="relative flex items-center justify-center">
              <span className="text-xl font-bold text-slate-900">L</span>
              <Leaf className="absolute -top-1 -right-2 text-emerald-500 w-3 h-3 fill-emerald-500" />
           </div>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">Lomaa</h1>
          <p className="text-[10px] text-emerald-400 font-medium tracking-wider">IT SOLUTIONS</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              currentView === item.view
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