import React, { useState } from 'react';
import { ViewState } from '../types';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
    user: {
    role: 'ADMIN' | 'EMPLOYEE';
  };
  pendingLeaveCount?: number;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, onLogout, user, pendingLeaveCount, children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

   if (!user) {
    return <div className="p-6">Loading layout...</div>;
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        currentView={currentView}
        setView={setView}
        onLogout={onLogout}
        user={user}
        pendingLeaveCount={pendingLeaveCount}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white flex items-center gap-3 px-4 py-3 shadow-md">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <span className="font-bold text-sm">Lomaa IT Solutions</span>
      </div>

      <main className="lg:pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
