import React, { useEffect, useMemo, useState } from 'react';
import { Employee, ViewState, EmployeeAttendance, AttendanceStatus, Bill, LeaveRequest } from './types';
import { INITIAL_EMPLOYEES, generateMockAttendance } from './constants';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { PayrollManager } from './components/PayrollManager';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
// import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import EmployeesView from './components/EmployeesView';
import EmployeePortal from './components/EmployeePortal';
import { BillManager } from './components/BillManager';
import { LeaveManager } from './components/LeaveRequest';
import { DailyLogs } from './components/DailyLogs';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'lomaa_token';

type AuthPage = 'login' | 'forgot' | 'reset';

type CurrentUser = {
  role: 'ADMIN' | 'EMPLOYEE';
  employeeId?: string;
  name?: string;
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const App: React.FC = () => {
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [resetToken, setResetToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken());
  // const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [bills, setBills] = useState<Bill[]>([]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);


  useEffect(() => {
    const path = window.location.pathname;

    if (path.startsWith('/reset-password/')) {
      const token = path.split('/reset-password/')[1];

      if (token) {
        setResetToken(token);
        setAuthPage('reset');
        setIsAuthenticated(false); // force auth screen
      }
    }
  }, []);


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


  function logout() {
    setToken(null);
    setCurrentUser(null);
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
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    setLoading(true);
    try {
      await loadEmployeesFromApi();
      await loadAttendanceFromApi();
    } finally {
      setLoading(false);
    }
  }


  // useEffect(() => {
  //   if (isAuthenticated) {
  //     loadAllData().catch(err => console.error('Initial load failed', err));
  //   }
  // }, [isAuthenticated]);

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
      const newEmployee: Employee = empData as Employee; // ✅ KEEP USER ID (EMP777)

      setEmployees(prev => [...prev, newEmployee]);
      setAttendance(prev => [...prev, generateMockAttendance(newEmployee.id)]);

      try {
        await apiFetch('/employees', {
          method: 'POST',
          body: JSON.stringify(newEmployee), // ✅ SEND EMP777 EXACTLY
        });
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
      loadAttendanceFromApi().catch(() => { });
    }
  };


  const getFilteredEmployees = useMemo(() => employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [employees, searchTerm]);

  async function handleLoginWrapper() {
    try {
      setIsAuthenticated(true);
      // setAuthLoading(true);
      await loadCurrentUser();
      // await loadAllData();
    } catch (err) {
      console.warn('Login wrapper error', err);
      setToken(null);
      setCurrentUser(null);
      // setAuthLoading(false);
      setIsAuthenticated(false);
    }
  }

  async function loadCurrentUser() {
    try {
      const user = await apiFetch('/auth/me'); // we'll add this API
      setCurrentUser({
        role: user.role.toUpperCase() as 'ADMIN' | 'EMPLOYEE', // 'ADMIN' | 'EMPLOYEE'
        employeeId: user.role === 'EMPLOYEE' ? user.employeeId : undefined,
        name: user.username,
      });
    } catch {
      logout()
    }
    //  finally{
    //   setAuthLoading(false);
    //  }
  }

  async function loadLeaves() {
    try {
      const rows = await apiFetch('/leaves'); // admin endpoint
      setLeaveRequests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Failed to load leaves', err);
    }
  }

  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      loadCurrentUser();
    }
  }, [isAuthenticated]);


  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'ADMIN') {
      loadAllData().catch(err => console.error(err));
      loadLeaves();
    }
  }, [isAuthenticated, currentUser]);


  const handleAddBill = (bill: Bill) => {
    setBills(prev => [...prev, bill]);
  };

  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const handleUpdateBillStatus = (
    id: string,
    status: 'Paid' | 'Rejected' | 'Pending'
  ) => {
    setBills(prev =>
      prev.map(b => b.id === id ? { ...b, status } : b)
    );
  };

  async function handleUpdateLeaveStatus(
    id: string,
    status: 'Approved' | 'Rejected'
  ) {
    try {
      const updated = await apiFetch(`/leaves/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      setLeaveRequests(prev =>
        prev.map(l => (l.id === id ? updated : l))
      );
    } catch (err) {
      console.error('Failed to update leave status', err);
      alert('Failed to update leave');
    }
  }



  if (!isAuthenticated) {
    return (
      <>
        {/* {authPage === 'signup' && (
          <SignUp onGoLogin={() => setAuthPage('login')} />
        )} */}
        {authPage === 'login' && (
          <Login
            onLogin={() => handleLoginWrapper()}
            onGoForgot={() => setAuthPage('forgot')}
          // onGoSignup={() => setAuthPage('signup')} 
          />)}
        {authPage === 'forgot' && (
          <ForgotPassword onGoLogin={() => setAuthPage('login')} />
        )}
        {authPage === 'reset' && (
          <ResetPassword token={resetToken} onGoLogin={() => setAuthPage('login')} />
        )}
      </>
    );
  }

  // if (authLoading) {
  //   return <div className="p-6">Loading user...</div>;
  // }


  return (
    <Layout currentView={currentView} setView={setCurrentView} onLogout={() => { logout(); }} user={currentUser ?? undefined}>
      {loading && (<div className="p-4">Loading...</div>)}

      {currentUser?.role === 'ADMIN' && (
        <>
          {currentView === 'DASHBOARD' && <Dashboard employees={employees} attendance={attendance} />}

          {currentView === 'EMPLOYEES' && (
            <EmployeesView
              employees={employees}
              getFilteredEmployees={getFilteredEmployees}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onAdd={() => { setEditingEmployee(null); setIsFormModalOpen(true); }}
              onEdit={(emp) => { setEditingEmployee(emp); setIsFormModalOpen(true); }}
              onDelete={handleDeleteEmployee}
              onView={(emp) => setViewingEmployee(emp)}
            />
          )}

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

          {currentView === 'BILLS' && <BillManager />}


          {currentView === 'LEAVES' && (
            <LeaveManager
              employees={employees}
              leaveRequests={leaveRequests}
              onUpdateStatus={handleUpdateLeaveStatus}
            />
          )}

          {currentView === 'DAILY_LOGS' && <DailyLogs />}

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
        </>
      )}
      {currentUser?.role === 'EMPLOYEE' && (
        <EmployeePortal
          currentView={currentView}
        // employee={employees.find(e => e.id === currentUser.employeeId)!}
        // attendance={attendance}
        // payslips={{}} 
        // leaveRequests={[]}
        // onAddLeaveRequest={() => {}}
        />
      )}
    </Layout>
  );
};

export default App;
