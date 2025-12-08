import React, { useState } from 'react';
import { X, Download, Calendar } from 'lucide-react';

interface ExportRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (start: string, end: string) => void;
  type: 'date' | 'month';
  title: string;
}

export const ExportRangeModal: React.FC<ExportRangeModalProps> = ({ isOpen, onClose, onExport, type, title }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) {
      alert('Please select both start and end ranges');
      return;
    }
    if (start > end) {
      alert('Start range cannot be after end range');
      return;
    }
    onExport(start, end);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Calendar size={18} /> {title}
          </h3>
          <button onClick={onClose} className="hover:bg-slate-800 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From</label>
              <input 
                type={type} 
                required 
                value={start} 
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
              <input 
                type={type} 
                required 
                value={end} 
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
            >
              <Download size={18} /> Export Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};