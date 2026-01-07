
import React, { useState } from 'react';
import { Employee, LeaveRequest } from '../types';
import { CalendarClock, Check, X, Calendar, User, FileText, Search } from 'lucide-react';

interface LeaveManagerProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  onUpdateStatus: (id: string, status: 'Approved' | 'Rejected') => void;
}

export const LeaveManager: React.FC<LeaveManagerProps> = ({ employees, leaveRequests, onUpdateStatus }) => {
  const [search, setSearch] = useState("");

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const filtered = leaveRequests.filter(r => {
    const emp = getEmployee(r.employeeId);
    const text = `${emp?.name} ${emp?.id} ${r.type} ${r.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const pendingRequests = filtered.filter(r => r.status === 'Pending');
  const pastRequests = filtered.filter(r => r.status !== 'Pending');


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="text-emerald-600" />
            Leave Management
          </h2>
          <p className="text-slate-500 mt-1 text-sm">Review and manage employee leave applications.</p>
        </div>
       
        <div className="flex items-center gap-2">
           <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee "
            className="border px-9 py-1.5 rounded-lg w-full md:w-72"
          />

        </div>
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold border border-amber-200">
            {pendingRequests.length} Pending
          </div>
        </div>
      </div>

      {/* Pending Section */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Pending Requests</h3>
        {pendingRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-100 text-center text-slate-400">
            <Check size={40} className="mx-auto mb-2 text-emerald-200" />
            <p>All clear! No pending leave requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map(req => {
              const emp = getEmployee(req.employeeId);
              return (
                <div key={req.id} className="bg-white rounded-xl shadow-sm border border-l-4 border-l-amber-400 border-slate-100 p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {emp?.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{emp?.name || 'Unknown'}</h4>
                        <p className="text-xs text-slate-500">{emp?.role}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                      {req.type}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      <Calendar size={16} className="text-slate-400" />
                      <span className="font-medium">{req.startDate}</span> to <span className="font-medium">{req.endDate}</span>
                    </div>
                    <div className="flex gap-2 text-sm text-slate-600">
                      <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="italic text-slate-600">"{req.reason}"</p>
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => onUpdateStatus(req.id, 'Rejected')}
                      className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <X size={16} /> Reject
                    </button>
                    <button
                      onClick={() => onUpdateStatus(req.id, 'Approved')}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-200"
                    >
                      <Check size={16} /> Approve
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Applied on {req.appliedOn}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Section */}
      {pastRequests.length > 0 && (
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Decision History</h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Employee</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Type</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Dates</th>
                  <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRequests.map(req => {
                  const emp = getEmployee(req.employeeId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm font-medium text-slate-800">
                        {emp?.name} <span className="text-slate-400 font-normal">({req.employeeId})</span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{req.type}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {req.startDate} <span className="text-slate-400 px-1">to</span> {req.endDate}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'Approved'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
