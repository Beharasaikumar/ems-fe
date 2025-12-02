import React, { useEffect, useState } from 'react';
import { X, Briefcase, Mail, Phone, Calendar, CreditCard, User, Landmark, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import { Employee } from '../types';

interface EmployeeDetailsModalProps {
  employee?: Employee | null;      
  employeeId?: string | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;  
}

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee: initialEmployee, employeeId, onClose, onDeleted }) => {
  const [employee, setEmployee] = useState<Employee | null>(initialEmployee ?? null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

   const idToUse = employeeId ?? initialEmployee?.id ?? null;

  useEffect(() => {
     if (!initialEmployee && idToUse) {
      fetchEmployee(idToUse);
    } else {
       setEmployee(initialEmployee ?? null);
    }
   }, [initialEmployee, idToUse]);

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any ?? {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) {
       localStorage.removeItem(TOKEN_KEY);
      throw new Error('Unauthorized — please login again');
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return res.json();
    return res;
  }

  async function fetchEmployee(id: string) {
    try {
      setLoading(true);
      const data = await apiFetch(`/employees/${id}`) as Employee;
      setEmployee(data);
    } catch (err: any) {
      console.error('Failed to fetch employee', err);
      alert(err?.message ?? 'Failed to fetch employee');
     } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!idToUse) return;
    await fetchEmployee(idToUse);
  }

  async function handleDelete() {
    if (!idToUse) return;
    if (!confirm('Delete this employee? This action cannot be undone.')) return;
    try {
      setDeleting(true);
      await apiFetch(`/employees/${idToUse}`, { method: 'DELETE' });
      onDeleted?.(idToUse);
      onClose();
    } catch (err: any) {
      console.error('Delete failed', err);
      alert(err?.message ?? 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  if (!employee && !loading) return null; 

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="bg-slate-900 p-4 flex justify-between items-start text-white relative overflow-hidden shrink-0">
          <div className="flex gap-4 items-start">
            <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg">
              {employee?.name?.charAt(0) ?? 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold">{employee?.name ?? 'Employee'}</h2>
              <p className="text-emerald-400 font-medium">{employee?.role}</p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                {employee?.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Refresh" className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-300 hover:text-white">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete Employee"
              className="p-2 hover:bg-red-700 rounded-md transition-colors text-red-200 hover:text-white"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors relative z-10 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-6">Loading…</div>
          ) : (
            <>
              {/* Work Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wide">
                    <Briefcase size={14} /> Department
                  </div>
                  <p className="font-medium text-slate-800">{employee?.department ?? 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wide">
                    <Calendar size={14} /> Date Joined
                  </div>
                  <p className="font-medium text-slate-800">{employee?.joinDate ?? 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email Address</p>
                    <p className="font-medium text-slate-800 text-sm">{employee?.email ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone Number</p>
                    <p className="font-medium text-slate-800 text-sm">{employee?.phone ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">PAN Number</p>
                    <p className="font-medium text-slate-800 text-sm uppercase">{employee?.pan ?? 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Landmark size={16} className="text-emerald-600" /> Salary Structure
                </h4>
                <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Basic Salary</span>
                    <span className="font-medium text-slate-800">₹{(employee?.basicSalary ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HRA</span>
                    <span className="font-medium text-slate-800">₹{(employee?.hra ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DA</span>
                    <span className="font-medium text-slate-800">₹{(employee?.da ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Special Allowance</span>
                    <span className="font-medium text-slate-800">₹{(employee?.specialAllowance ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold">
                    <span className="text-slate-700">Gross Monthly</span>
                    <span className="text-emerald-700">
                      ₹{(((employee?.basicSalary ?? 0) + (employee?.hra ?? 0) + (employee?.da ?? 0) + (employee?.specialAllowance ?? 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statutory */}
              <div className="pt-2">
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" /> Statutory & Banking
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Bank Account</p>
                    <p className="font-medium text-slate-800">{employee?.bankAccountNumber ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">PF Number</p>
                    <p className="font-medium text-slate-800 uppercase">{employee?.pfAccountNumber ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ESI Number</p>
                    <p className="font-medium text-slate-800">{employee?.esiNumber ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsModal;
