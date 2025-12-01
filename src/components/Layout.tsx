import React from 'react';
import { ViewState } from '../types';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setView={setView} onLogout={onLogout} />
      <main className="pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
