import React, { useMemo } from 'react';
import { Employee, EmployeeAttendance } from '../types';
import { Users, Pencil, Trash2, Eye, Download, TrendingUp } from 'lucide-react';
import FilteredEmployeeSearch from '../ui/FilteredEmployeeSearch';
import { exportToCSV } from '../utils/utils';

interface Props {
  employees: Employee[];
  getFilteredEmployees: Employee[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  onAdd: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (id: string) => void;
  onView: (e: Employee) => void;
  onQuickIncrement?: (e: Employee) => void;
}

const EmployeesView: React.FC<Props> = ({ employees, getFilteredEmployees, searchTerm, setSearchTerm, onAdd, onEdit, onDelete, onView, onQuickIncrement }) => {
  const filteredEmployees = useMemo(() => getFilteredEmployees, [getFilteredEmployees]);

const handleExportEmployees = () => {
      const data = filteredEmployees.map(e => ({
        ID: e.id,
        Name: e.name,
        Email: e.email,
        Phone: e.phone,
        Role: e.role,
        Department: e.department,
        JoinDate: e.joinDate,
        PAN: e.pan,
        monthly: e.monthlyGrossSalary,
        BasicSalary: e.basicSalary || 0,
        HRA: e.hra || 0,
        DA: e.da || 0,
        Special: e.specialAllowance || 0,
        BankAccount: e.bankAccountNumber || '',
        PF: e.pfAccountNumber || '',
        ESI: e.esiNumber || ''
      }));
      exportToCSV(data, 'Employees_List.csv');
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 min-w-0">
            <Users className="text-emerald-600 shrink-0" />
            <span className="truncate block min-w-0">Employee Directory</span>
          </h2>
        </div>

        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-1 md:gap-3">
          <div className="w-full md:w-[320px]">
            <FilteredEmployeeSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showAdd
              onAddClick={onAdd}
              inputWidthClass="w-full"
              placeholder="Search employees..."
            />
          </div>
          
         <button 
              onClick={handleExportEmployees}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap"
            >
              <Download size={18} /> <span className="hidden sm:inline">Export List</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* responsive wrapper: allow horizontal scroll on very small screens */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] md:min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 md:p-4 font-semibold text-slate-600 text-sm">Details</th>
                <th className="hidden sm:table-cell p-3 md:p-4 font-semibold text-slate-600 text-sm">Role & Dept</th>
                <th className="hidden md:table-cell p-3 md:p-4 font-semibold text-slate-600 text-sm">Contact</th>
                <th className="p-3 md:p-4 font-semibold text-slate-600 text-sm">Total Pay</th>
                <th className="p-3 md:p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 group">
                  <td className="p-3 md:p-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-base shadow-md">
                        {emp.name?.split(' ').map(n => n[0]).join('') ?? emp.id}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{emp.id}</p>
                        {/* small-screen role/dept fallback */}
                        <div className="mt-1 sm:hidden text-xs text-slate-500">
                          <span className="inline-block mr-2">{emp.role}</span>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs border border-slate-200">{emp.department}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="hidden sm:table-cell p-3 md:p-4 align-top">
                    <p className="font-medium text-slate-700">{emp.role}</p>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs mt-1 border border-slate-200">
                      {emp.department}
                    </span>
                  </td>

                  <td className="hidden md:table-cell p-3 md:p-4 align-top">
                    <p className="text-sm text-slate-600 truncate">{emp.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{emp.phone}</p>
                  </td>

                  <td className="p-3 md:p-4 align-top font-medium text-slate-700">
                    <div className="whitespace-nowrap">₹{(emp.monthlyGrossSalary ?? 0).toLocaleString()}</div>
                  </td>

                  <td className="p-3 md:p-4 align-top text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {onQuickIncrement && (
                        <button onClick={() => onQuickIncrement(emp)} title="Update Salary / Increment" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <TrendingUp size={18} />
                        </button>
                      )}
                      <button onClick={() => onView(emp)} title="View Details" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => onEdit(emp)} title="Edit Employee" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => onDelete(emp.id)} title="Delete Employee" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-6 md:p-8 text-center text-slate-500">
            {employees.length === 0
              ? 'No employees found. Click "Add Employee" to get started.'
              : 'No employees match your search.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesView;
