// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Employee, ViewState, EmployeeAttendance, AttendanceStatus } from './types';
import { INITIAL_EMPLOYEES, generateMockAttendance } from './constants';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { PayrollManager } from './components/PayrollManager';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { Users, Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken());
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // data state
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>(() =>
    INITIAL_EMPLOYEES.map(e => generateMockAttendance(e.id))
  );
  const [loading, setLoading] = useState(false);

  // UI state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // --- API helpers ---
  async function apiFetch(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any ?? {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) {
      // token invalid -> logout
      setToken(null);
      setIsAuthenticated(false);
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Request failed ${res.status}`);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return res.json();
    return res;
  }

  // // --- Auth / Login ---
  // async function login(username: string, password: string) {
  //   try {
  //     const res = await fetch(`${API_BASE}/auth/login`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ username, password })
  //     });
  //     if (!res.ok) {
  //       const txt = await res.text().catch(() => '');
  //       throw new Error(txt || 'Login failed');
  //     }
  //     const data = await res.json();
  //     // expect { token, user? }
  //     if (!data.token) throw new Error('Invalid login response (token missing)');
  //     setToken(data.token);
  //     setIsAuthenticated(true);
  //     // load initial data
  //     await loadAllData();
  //   } catch (err: any) {
  //     console.error('Login failed', err);
  //     throw err;
  //   }
  // }

  function logout() {
    setToken(null);
    setIsAuthenticated(false);
  }

  // --- Data loaders ---
  const currentMonthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  }, []);

  async function loadEmployeesFromApi() {
    try {
      const rows = (await apiFetch('/employees')) as Employee[];
      if (Array.isArray(rows) && rows.length > 0) {
        setEmployees(rows);
      }
    } catch (err) {
      console.warn('loadEmployeesFromApi failed, keeping local employees', err);
    }
  }

  async function loadAttendanceFromApi(month = currentMonthPrefix) {
    try {
      const rows = (await apiFetch(`/attendance?month=${encodeURIComponent(month)}`)) as Array<{
        id: string;
        employeeId: string;
        date: string;
        status: string;
      }>;
 
      const grouped: Record<string, { date: string; status: AttendanceStatus }[]> = {};
      for (const r of rows) {
        if (!grouped[r.employeeId]) grouped[r.employeeId] = [];
        grouped[r.employeeId].push({ date: r.date, status: r.status as AttendanceStatus });
      }
      const out: EmployeeAttendance[] = employees.map(e => ({
        employeeId: e.id,
        records: grouped[e.id] ?? []
      }));
      setAttendance(out);
    } catch (err) {
      console.warn('loadAttendanceFromApi failed, keeping local attendance', err);
    }
  }

  async function loadAllData() {
    setLoading(true);
    try {
      await loadEmployeesFromApi();
      await loadAttendanceFromApi();
    } finally {
      setLoading(false);
    }
  }

   useEffect(() => {
    if (isAuthenticated) {
      loadAllData().catch(err => console.error('Initial load failed', err));
    }
   }, [isAuthenticated]);

   const handleFormSubmit = async (empData: Omit<Employee, 'id'>) => {
    if (editingEmployee) {
       const updated: Employee = { ...empData, id: editingEmployee.id };
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditingEmployee(null);
       try {
        await apiFetch(`/employees/${encodeURIComponent(updated.id)}`, {
          method: 'PUT',
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.warn('Update employee API failed', err);
      }
    } else {
       const newId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
      const newEmployee: Employee = { ...empData, id: newId };
      setEmployees(prev => [...prev, newEmployee]);
      setAttendance(prev => [...prev, generateMockAttendance(newId)]);
       try {
        await apiFetch('/employees', { method: 'POST', body: JSON.stringify(newEmployee) });
      } catch (err) {
        console.warn('Create employee API failed', err);
      }
    }
    setIsFormModalOpen(false);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
    setAttendance(prev => prev.filter(a => a.employeeId !== id));
    try {
      await apiFetch(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete employee API failed', err);
    }
  };

   const handleUpdateAttendance = async (empId: string, date: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      let found = false;
      const next = prev.map(a => {
        if (a.employeeId !== empId) return a;
        found = true;
        const idx = a.records.findIndex(r => r.date === date);
        const newRecords = [...a.records];
        if (idx >= 0) newRecords[idx] = { date, status };
        else newRecords.push({ date, status });
        return { ...a, records: newRecords };
      });
      if (!found) next.push({ employeeId: empId, records: [{ date, status }] });
      return next;
    });

    try {
       await apiFetch('/attendance', { method: 'POST', body: JSON.stringify({ employeeId: empId, date, status }) });
    } catch (err) {
      console.error('Failed to persist attendance, you may need to retry', err);
       loadAttendanceFromApi().catch(() => {});
    }
  };

  //  const handleGeneratePayslip = async (empId: string) => {
  //   try {
  //     const payload = await apiFetch(`/payroll/generate/${encodeURIComponent(empId)}`, { method: 'POST', body: JSON.stringify({}) });
  //      console.log('Generated payslip', payload);
  //     alert(`Payslip generated for ${empId}`);
  //   } catch (err) {
  //     console.error('Payslip generation failed', err);
  //     alert(`'Payslip generation failed: ' + (err as any)?.message ?? ''`);
  //   }
  // };

   const getFilteredEmployees = () =>
    employees.filter(emp =>
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.id.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.department.toLowerCase().includes(employeeSearch.toLowerCase())
    );

   async function handleLoginWrapper() {
     try {
       if (!getToken()) {
         setIsAuthenticated(true);
        await loadAllData();
        return;
      }
      setIsAuthenticated(true);
      await loadAllData();
    } catch (err) {
      console.warn('Login wrapper error', err);
      setIsAuthenticated(true);
    }
  }

   if (!isAuthenticated) {
    return <Login onLogin={() => handleLoginWrapper()} />;
  }

  const EmployeesView = () => {
    const filteredEmployees = getFilteredEmployees();

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100 gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-600" />
            Employee Directory
          </h2>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
              />
            </div>
            <button
              onClick={() => { setEditingEmployee(null); setIsFormModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 whitespace-nowrap"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Add Employee</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Details</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Role & Dept</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Basic Pay</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-700">{emp.role}</p>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs mt-1 border border-slate-200">
                      {emp.department}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-600">{emp.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{emp.phone}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    ₹{emp.basicSalary.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingEmployee(emp)}
                        title="View Details"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => { setEditingEmployee(emp); setIsFormModalOpen(true); }}
                        title="Edit Employee"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        title="Delete Employee"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEmployees.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              {employees.length === 0
                ? 'No employees found. Click "Add Employee" to get started.'
                : 'No employees match your search.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} onLogout={() => { logout(); }}>
      {loading && (<div className="p-4">Loading...</div>)}

      {currentView === 'DASHBOARD' && <Dashboard employees={employees} attendance={attendance} />}

      {currentView === 'EMPLOYEES' && <EmployeesView />}

      {currentView === 'ATTENDANCE' && (
        <AttendanceManager
          employees={employees}
          attendance={attendance}
          onUpdateAttendance={handleUpdateAttendance}
        />
      )}

      {currentView === 'PAYROLL' && (
        <PayrollManager
          employees={employees}
          attendance={attendance}
        />
      )}

      <AddEmployeeModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        employeeToEdit={editingEmployee}
      />

      <EmployeeDetailsModal
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
      />
    </Layout>
  );
};

export default App;
