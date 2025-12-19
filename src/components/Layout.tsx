import React from 'react';
import { ViewState } from '../types';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
    user: {
    role: 'ADMIN' | 'EMPLOYEE';
  };
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, onLogout, user, children }) => {
   if (!user) {
    return <div className="p-6">Loading layout...</div>;
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setView={setView} onLogout={onLogout} user={user} />
      <main className="pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
