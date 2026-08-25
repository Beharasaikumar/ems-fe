import React, { useState, useEffect } from 'react';
import { Employee, SalaryRevision } from '../types';
import { X, Save, Calculator, Wallet, Building2, CreditCard, TrendingUp, Plus, Trash2, Award } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../api/api';
import { mergeEarningsForDisplay } from '../utils/annualPayroll';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeePayload: Omit<Employee, 'id'> & { id: string }) => void;
  employeeToEdit?: Employee | null;
  onEmployeeUpdated?: (updated: Employee) => void;
  initialTab?: 'general' | 'revisions';
}

const OTHER_VALUE = '__OTHER__';

const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Management & Administration': ['CEO', 'Managing Director', 'COO', 'General Manager', 'Executive Assistant'],
  'Human Resources (HR)': ['HR Manager', 'HR Executive', 'HR Recruiter', 'Payroll Executive', 'HR Assistant'],
  'Finance & Accounts': ['Finance Manager', 'Accountant', 'Accounts Executive', 'Finance Analyst', 'Billing Executive'],
  'Software Development': ['Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Mobile App Developer'],
  'AI & Data Science': ['AI Engineer', 'ML Engineer', 'Data Scientist', 'Generative AI Engineer', 'Data Analyst'],
  'QA & Testing': ['QA Manager', 'QA Engineer', 'Manual Tester', 'Automation Tester', 'Performance Tester'],
  'UI/UX & Design': ['UI Designer', 'UX Designer', 'Graphic Designer', 'Product Designer'],
};

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_ROLES);

const ALL_ROLES = Array.from(new Set(Object.values(DEPARTMENT_ROLES).flat())).sort();

const roleOptionsFor = (dept: string) => (DEPARTMENT_OPTIONS.includes(dept) ? DEPARTMENT_ROLES[dept] : ALL_ROLES);

// const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

// function getToken(): string | null {
//   return localStorage.getItem('lomaa_token');
// }

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSubmit, employeeToEdit, onEmployeeUpdated, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'revisions'>('general');
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [showIncrementForm, setShowIncrementForm] = useState(false);
  const [incrementEffectiveDate, setIncrementEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [incrementGross, setIncrementGross] = useState('');
  const [incrementReason, setIncrementReason] = useState('');
  const [applyingIncrement, setApplyingIncrement] = useState(false);
  const [incrementError, setIncrementError] = useState('');
  const [deletingRevisionId, setDeletingRevisionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    joinDate: new Date().toISOString().split('T')[0],
    pan: '',
    monthlyGrossSalary: '',
    basicSalary: '',
    hra: '',
    da: '',
    specialAllowance: '',
    bankAccountNumber: '',
    pfAccountNumber: '',
    esiNumber: '',
    esiEnabled: true,
    pfEnabled: true
  });

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deptChoice, setDeptChoice] = useState('');
  const [roleChoice, setRoleChoice] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab === 'revisions' && employeeToEdit ? 'revisions' : 'general');
    setShowIncrementForm(false);
    setIncrementGross('');
    setIncrementReason('');
    setIncrementError('');
    setIncrementEffectiveDate(new Date().toISOString().split('T')[0]);
    if (employeeToEdit) {
      setFormData({
        id: employeeToEdit.id ?? '',
        name: employeeToEdit.name ?? '',
        email: employeeToEdit.email ?? '',
        phone: employeeToEdit.phone ?? '',
        role: employeeToEdit.role ?? '',
        department: employeeToEdit.department ?? '',
        joinDate: employeeToEdit.joinDate ?? new Date().toISOString().split('T')[0],
        pan: employeeToEdit.pan ?? '',
        monthlyGrossSalary: employeeToEdit.basicSalary ? String(Math.round((employeeToEdit.basicSalary / 0.4) || 0)) : '',
        basicSalary: employeeToEdit.basicSalary ? String(employeeToEdit.basicSalary) : '',
        hra: employeeToEdit.hra ? String(employeeToEdit.hra) : '',
        da: employeeToEdit.da ? String(employeeToEdit.da) : '',
        specialAllowance: employeeToEdit.specialAllowance ? String(employeeToEdit.specialAllowance) : '',
        bankAccountNumber: employeeToEdit.bankAccountNumber ?? '',
        pfAccountNumber: employeeToEdit.pfAccountNumber ?? '',
        esiNumber: employeeToEdit.esiNumber ?? '',
        esiEnabled: employeeToEdit.esiEnabled ?? true,
        pfEnabled: employeeToEdit.pfEnabled ?? true
      });
      const dept = employeeToEdit.department ?? '';
      const role = employeeToEdit.role ?? '';
      setDeptChoice(dept === '' ? '' : (DEPARTMENT_OPTIONS.includes(dept) ? dept : OTHER_VALUE));
      setRoleChoice(role === '' ? '' : (roleOptionsFor(dept).includes(role) ? role : OTHER_VALUE));
      setTouched({});
      setErrors({});
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        joinDate: new Date().toISOString().split('T')[0],
        pan: '',
        monthlyGrossSalary: '',
        basicSalary: '',
        hra: '',
        da: '',
        specialAllowance: '',
        bankAccountNumber: '',
        pfAccountNumber: '',
        esiNumber: '',
        esiEnabled: true,
        pfEnabled: true
      });
      setDeptChoice('');
      setRoleChoice('');
      setTouched({});
      setErrors({});
      setRevisions([]);
    }
  }, [isOpen, employeeToEdit]);

  useEffect(() => {
    if (!isOpen || !employeeToEdit) return;
    let cancelled = false;
    setLoadingRevisions(true);
    apiGet(`/employees/${encodeURIComponent(employeeToEdit.id)}/salary-revisions`)
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRevisions(data);
      })
      .catch((err) => console.warn('Failed to load salary revisions', err))
      .finally(() => { if (!cancelled) setLoadingRevisions(false); });
    return () => { cancelled = true; };
  }, [isOpen, employeeToEdit]);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'id':
        if (!value.trim()) return 'Employee ID is required';
        if (!/^[A-Za-z0-9_-]+$/.test(value))
          return 'Only letters, numbers, - and _ allowed';
        return '';
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email';
        return '';
      case 'phone':
        const onlyDigits = value.replace(/\D/g, '');
        if (!onlyDigits) return 'Phone is required';
        if (onlyDigits.length !== 10) return 'Phone must be exactly 10 digits';
        if (!/^\d{10}$/.test(onlyDigits)) return 'Phone must contain only numbers';
        return '';
      case 'role':
        if (!value.trim()) return 'Role is required';
        if (value.trim().length < 2) return 'Role must be at least 2 characters';
        return '';
      case 'department':
        if (!value.trim()) return 'Department is required';
        return '';
      case 'pan':
        if (!value.trim()) return 'PAN is required';
        if (!PAN_REGEX.test(value.toUpperCase())) return 'PAN must be in format: AAAAA9999A';
        return '';
      case 'monthlyGrossSalary':
        if (!value && value !== '0') return 'Monthly gross salary is required';
        if (isNaN(Number(value))) return 'Gross salary must be a number';
        if (Number(value) <= 0) return 'Gross salary must be greater than 0';
        return '';
      case 'basicSalary':
        if (value === '' && value === undefined) return 'Basic salary is required';
        const basicNum = Number(value);
        if (isNaN(basicNum)) return 'Basic salary must be a number';
        if (basicNum <= 0) return 'Basic salary must be greater than 0';
        return '';
      case 'hra':
      case 'da':
      case 'specialAllowance':
        if (value === '' || value === undefined) return '';
        if (isNaN(Number(value))) return `${name} must be a number`;
        if (Number(value) < 0) return `${name} cannot be negative`;
        return '';
      case 'bankAccountNumber':
        if (!value) return '';
        if (value.replace(/\s/g, '').length < 9) return 'Bank account number should be at least 9 characters';
        return '';
      case 'pfAccountNumber':
        if (!value) return '';
        if (value.length < 5) return 'PF account no should be at least 5 characters';
        return '';
      case 'esiNumber':
        if (!value) return '';
        if (value.length < 5) return 'ESI number should be at least 5 characters';
        return '';
      default:
        return '';
    }
  };

  const validateAll = (data = formData) => {
    const newErrors: Record<string, string> = {};
    const requiredFields = ['id', 'name', 'email', 'phone', 'role', 'department', 'pan', 'monthlyGrossSalary', 'basicSalary'];

    Object.keys(data).forEach((k) => {
      const val = (data as any)[k];
      const err = validateField(k, String(val ?? ''));
      if (err) newErrors[k] = err;
    });

    requiredFields.forEach((f) => {
      if (!data[f as keyof typeof data] && data[f as keyof typeof data] !== 0) {
        newErrors[f] = newErrors[f] ?? `${f} is required`;
      }
    });

    return newErrors;
  };

  useEffect(() => {
    const newErrors = validateAll();
    setErrors(newErrors);
  }, [formData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const currentErrors = validateAll();
    setErrors(currentErrors);

    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(k => (allTouched[k] = true));
    setTouched(allTouched);

    if (Object.keys(currentErrors).length > 0) {
      setSaving(false);
      const firstError = Object.keys(currentErrors)[0];
      const el = document.querySelector(`[name="${firstError}"]`) as HTMLElement | null;
      if (el) el.focus();
      return;
    }


    try {
      const payload: Omit<Employee, 'id'> & { id: string } = {
        id: formData.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        joinDate: formData.joinDate,
        pan: formData.pan,
        monthlyGrossSalary: formData.monthlyGrossSalary ? Number(formData.monthlyGrossSalary) : 0,
        basicSalary: formData.basicSalary ? Number(formData.basicSalary) : 0,
        hra: formData.hra ? Number(formData.hra) : 0,
        da: formData.da ? Number(formData.da) : 0,
        specialAllowance: formData.specialAllowance ? Number(formData.specialAllowance) : 0,
        bankAccountNumber: formData.bankAccountNumber,
        pfAccountNumber: formData.pfAccountNumber,
        esiNumber: formData.esiNumber,
        esiEnabled: formData.esiEnabled,
        pfEnabled: formData.pfEnabled
      };

      onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const recalcFromGross = (grossStr: string) => {
    const gross = Number(grossStr);
    if (isNaN(gross) || gross <= 0) {
      setFormData(prev => ({
        ...prev,
        basicSalary: '',
        hra: '',
        da: '',
        specialAllowance: ''
      }));
      return;
    }
    const basic = Math.round(gross * 0.40);
    const hra = Math.round(basic * 0.50);
    const da = Math.round(basic * 0.20);
    const special = Math.max(0, gross - basic - hra - da);
    setFormData(prev => ({
      ...prev,
      basicSalary: String(basic),
      hra: String(hra),
      da: String(da),
      specialAllowance: String(special)
    }));
  };

  const latestRevisionGross = () => (revisions.length > 0 ? revisions[revisions.length - 1].monthlyGrossSalary : Number(formData.monthlyGrossSalary) || 0);

  const handleApplyIncrement = async () => {
    if (!employeeToEdit) return;
    setIncrementError('');

    const gross = Number(incrementGross);
    if (!incrementEffectiveDate) {
      setIncrementError('Effective date is required');
      return;
    }
    if (!incrementGross || isNaN(gross) || gross <= 0) {
      setIncrementError('Enter a valid new monthly gross salary');
      return;
    }

    const basic = Math.round(gross * 0.40);
    const hra = Math.round(basic * 0.50);
    const da = Math.round(basic * 0.20);
    const special = Math.max(0, gross - basic - hra - da);

    setApplyingIncrement(true);
    try {
      const res = await apiPost(`/employees/${encodeURIComponent(employeeToEdit.id)}/salary-revisions`, {
        effectiveDate: incrementEffectiveDate,
        monthlyGrossSalary: gross,
        basicSalary: basic,
        hra,
        da,
        specialAllowance: special,
        reason: incrementReason || undefined,
      });
      if (Array.isArray(res?.revisions)) setRevisions(res.revisions);
      if (res?.employee) onEmployeeUpdated?.(res.employee);
      setShowIncrementForm(false);
      setIncrementGross('');
      setIncrementReason('');
      setIncrementEffectiveDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error(err);
      setIncrementError(err?.message ?? 'Failed to apply increment');
    } finally {
      setApplyingIncrement(false);
    }
  };

  const handleDeleteRevision = async (revisionId: string) => {
    if (!employeeToEdit) return;
    if (!window.confirm('Delete this salary revision? This cannot be undone.')) return;
    setDeletingRevisionId(revisionId);
    try {
      const res = await apiDelete(`/employees/${encodeURIComponent(employeeToEdit.id)}/salary-revisions/${encodeURIComponent(revisionId)}`);
      if (Array.isArray(res?.revisions)) setRevisions(res.revisions);
      if (res?.employee) onEmployeeUpdated?.(res.employee);
    } catch (err) {
      console.error('Failed to delete revision', err);
      alert('Failed to delete revision');
    } finally {
      setDeletingRevisionId(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name;
    let value = (e.target as HTMLInputElement).value;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'pan') {
      value = value.toUpperCase().slice(0, 10);
    }
    if (name === 'monthlyGrossSalary') {
      setFormData(prev => ({ ...prev, monthlyGrossSalary: value }));
      recalcFromGross(value);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, String((formData as any)[name] ?? ''));
    setErrors(prev => {
      const copy = { ...prev };
      if (err) copy[name] = err;
      else delete copy[name];
      return copy;
    });
  };

  const handleDepartmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDeptChoice(val);
    setRoleChoice(''); // role options depend on department, so reset the previous pick
    setFormData(prev => ({
      ...prev,
      department: val === OTHER_VALUE ? '' : val,
      role: ''
    }));
    setTouched(prev => ({ ...prev, department: true }));
  };

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRoleChoice(val);
    setFormData(prev => ({ ...prev, role: val === OTHER_VALUE ? '' : val }));
    setTouched(prev => ({ ...prev, role: true }));
  };

  const roleOptions = roleOptionsFor(formData.department);

  // const autoCalculateSalary = () => {
  //   const basic = Number(formData.basicSalary);
  //   if (!isNaN(basic) && basic > 0) {
  //     const hraVal = Math.round(basic * 0.50); // 50% of basic
  //     const daVal = Math.round(basic * 0.20);  // 20% of basic
  //     const specialVal = Math.max(0, basic - hraVal - daVal);
  //     setFormData(prev => ({
  //       ...prev,
  //       hra: String(hraVal),
  //       da: String(daVal),
  //       specialAllowance: String(specialVal)
  //     }));
  //     setTouched(prev => ({ ...prev, hra: true, da: true, specialAllowance: true }));
  //   } else {
  //     setTouched(prev => ({ ...prev, basicSalary: true }));
  //     setErrors(prev => ({ ...prev, basicSalary: 'Enter a valid basic salary before auto-fill' }));
  //   }
  // };

  const isSubmitDisabled = saving || Object.keys(errors).length > 0;

  const showError = (field: string) => {
    return touched[field] && errors[field] ? errors[field] : '';
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const sortedRevisions = [...revisions].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const currentActiveRevisionId = [...sortedRevisions].reverse().find(r => r.effectiveDate <= todayStr)?.id
    ?? sortedRevisions[sortedRevisions.length - 1]?.id;

  const previewPrevGross = latestRevisionGross();
  const previewNewGross = Number(incrementGross) || 0;
  const previewDiff = previewNewGross - previewPrevGross;
  const previewPct = previewPrevGross > 0 ? Math.round((previewDiff / previewPrevGross) * 1000) / 10 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-lg font-bold">{employeeToEdit ? `Edit Employee • ${employeeToEdit.name}` : 'Add New Employee'}</h2>
            {employeeToEdit && (
              <p className="text-slate-400 text-xs mt-0.5">{employeeToEdit.id} &bull; {employeeToEdit.role || 'N/A'} &bull; {employeeToEdit.department || 'N/A'}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {employeeToEdit && (
          <div className="flex gap-1 bg-slate-100 border-b border-slate-200 px-4 pt-3 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'general' ? 'bg-white text-slate-800 border border-b-white border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              style={activeTab === 'general' ? { marginBottom: -1 } : undefined}
            >
              General &amp; Salary Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('revisions')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'revisions' ? 'bg-white text-emerald-700 border border-b-white border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              style={activeTab === 'revisions' ? { marginBottom: -1 } : undefined}
            >
              <TrendingUp size={13} /> Salary Increment &amp; Revisions ({revisions.length})
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {activeTab === 'general' && (
            <>
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!errors.id}
                    placeholder="EMP001"
                    disabled={!!employeeToEdit}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {showError('id') && (
                    <p className="text-xs text-red-600 mt-1">{showError('id')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input required name="name" placeholder="Name" value={formData.name} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.name} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('name') && <p className="text-xs text-red-600 mt-1">{showError('name')}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Join Date *</label>
                  <input required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.joinDate} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('joinDate') && <p className="text-xs text-red-600 mt-1">{showError('joinDate')}</p>}

                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input required type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.email} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('email') && <p className="text-xs text-red-600 mt-1">{showError('email')}</p>}

                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input type="tel" inputMode="numeric" required name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.phone} maxLength={10} placeholder="Mobile number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('phone') && <p className="text-xs text-red-600 mt-1">{showError('phone')}</p>}

                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dept *</label>
                  <select required name="department" value={deptChoice} onChange={handleDepartmentSelect} onBlur={handleBlur} aria-invalid={!!errors.department} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                    <option value="" disabled>Select department</option>
                    {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value={OTHER_VALUE}>Other</option>
                  </select>
                  {deptChoice === OTHER_VALUE && (
                    <input
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter department"
                      aria-invalid={!!errors.department}
                      className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  )}
                  {showError('department') && <p className="text-xs text-red-600 mt-1">{showError('department')}</p>}

                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select required name="role" value={roleChoice} onChange={handleRoleSelect} onBlur={handleBlur} aria-invalid={!!errors.role} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                    <option value="" disabled>Select role</option>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value={OTHER_VALUE}>Other</option>
                  </select>
                  {roleChoice === OTHER_VALUE && (
                    <input
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter role"
                      aria-invalid={!!errors.role}
                      className="w-full px-3 py-2 mt-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  )}
                  {showError('role') && <p className="text-xs text-red-600 mt-1">{showError('role')}</p>}

                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN No *</label>
                  <input required name="pan" placeholder="Pan Number" value={formData.pan} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.pan} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none uppercase text-sm" />
                  {showError('pan') && <p className="text-xs text-red-600 mt-1">{showError('pan')}</p>}

                </div>
              </div>
            </div>
          </div>

          {/* Salary Structure */}
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wallet size={16} /> Salary Structure (Monthly)
              </h3>
              {/* <button
                type="button"
                onClick={autoCalculateSalary}
                className="text-emerald-600 text-xs font-bold hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                title="Auto Calculate Allowances"
              >
                <Calculator size={14} /> Auto-Fill Allowances
              </button> */}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Gross Salary *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">₹</span>
                  <input
                    required
                    type="number"
                    name="monthlyGrossSalary"
                    value={formData.monthlyGrossSalary}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!errors.monthlyGrossSalary}
                    placeholder="e.g. 50000"
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-lg"
                  />
                </div>
                {showError('monthlyGrossSalary') && <p className="text-xs text-red-600 mt-1">{showError('monthlyGrossSalary')}</p>}
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="block text-xs text-slate-500 mb-1">Basic Salary (40%)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">₹</span>
                    <span className="block font-semibold text-slate-800">{formData.basicSalary ? Number(formData.basicSalary).toLocaleString() : '0'}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="block text-xs text-slate-500 mb-1">HRA (50% of Basic)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">₹</span>
                    <span className="block font-semibold text-slate-800">{formData.hra ? Number(formData.hra).toLocaleString() : '0'}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="block text-xs text-slate-500 mb-1">DA (20% of Basic)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">₹</span>
                    <span className="block font-semibold text-slate-800">{formData.da ? Number(formData.da).toLocaleString() : '0'}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="block text-xs text-slate-500 mb-1">Special Allowance (Bal.)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">₹</span>
                    <span className="block font-semibold text-slate-800">{formData.specialAllowance ? Number(formData.specialAllowance).toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Banking & Statutory */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 size={16} /> Banking & Statutory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account No</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} onBlur={handleBlur} placeholder="Optional" className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('bankAccountNumber') && <p className="text-xs text-red-600 mt-1">{showError('bankAccountNumber')}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PF Account No</label>
                <input name="pfAccountNumber" value={formData.pfAccountNumber} onChange={handleChange} onBlur={handleBlur} placeholder="Optional" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm uppercase" />
                {showError('pfAccountNumber') && <p className="text-xs text-red-600 mt-1">{showError('pfAccountNumber')}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ESI Number</label>
                <input name="esiNumber" value={formData.esiNumber} onChange={handleChange} onBlur={handleBlur} placeholder="Optional" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                {showError('esiNumber') && <p className="text-xs text-red-600 mt-1">{showError('esiNumber')}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ESI Enabled
                </label>

                <select
                  name="esiEnabled"
                  value={formData.esiEnabled ? "true" : "false"}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      esiEnabled: e.target.value === "true"
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PF Enabled
                </label>

                <select
                  name="pfEnabled"
                  value={formData.pfEnabled ? "true" : "false"}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      pfEnabled: e.target.value === "true"
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>
            </>
          )}

          {activeTab === 'revisions' && employeeToEdit && (
            <div className="space-y-5">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" /> Salary Increments &amp; Revision Timeline
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Record date-effective salary increases. The system will automatically apply the revision from the effective date across monthly payslips and annual statements.
                  </p>
                </div>
                {!showIncrementForm && (
                  <button
                    type="button"
                    onClick={() => setShowIncrementForm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
                  >
                    <Plus size={14} /> Add Increment
                  </button>
                )}
              </div>

              {showIncrementForm && (
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Award size={13} /> Record New Salary Increment
                    </p>
                    <button type="button" onClick={() => { setShowIncrementForm(false); setIncrementError(''); }} className="text-xs text-slate-500 hover:text-slate-700">
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                      <input
                        type="date"
                        value={incrementEffectiveDate}
                        onChange={(e) => setIncrementEffectiveDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Monthly Gross Salary (₹) *</label>
                      <input
                        type="number"
                        value={incrementGross}
                        onChange={(e) => setIncrementGross(e.target.value)}
                        placeholder="e.g. 86250"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Appraisal / Increment Reason</label>
                      <input
                        type="text"
                        value={incrementReason}
                        onChange={(e) => setIncrementReason(e.target.value)}
                        placeholder="e.g. Annual Performance Appraisal"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                      />
                    </div>
                  </div>

                  {incrementError && <p className="text-xs text-red-600">{incrementError}</p>}

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md px-3 py-2">
                    <p className="text-xs text-slate-600">
                      Previous: <span className="font-semibold text-slate-800">₹{previewPrevGross.toLocaleString('en-IN')}/mo</span>
                      {' '}&rarr;{' '}
                      New: <span className="font-semibold text-slate-800">₹{previewNewGross.toLocaleString('en-IN')}/mo</span>
                      {previewNewGross > 0 && (
                        <span className={`ml-2 font-bold px-2 py-0.5 rounded-full text-[11px] ${previewDiff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {previewDiff >= 0 ? '+' : ''}₹{previewDiff.toLocaleString('en-IN')}/mo ({previewDiff >= 0 ? '+' : ''}{previewPct}%)
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={handleApplyIncrement}
                      disabled={applyingIncrement}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-60 shrink-0"
                    >
                      {applyingIncrement ? 'Applying...' : 'Apply Increment'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Configured Salary Structure History</h4>

                {loadingRevisions && <p className="text-xs text-slate-400">Loading history...</p>}
                {!loadingRevisions && sortedRevisions.length === 0 && (
                  <p className="text-xs text-slate-400">No salary revisions recorded yet. Add one above to start the timeline.</p>
                )}

                <div className="space-y-2">
                  {sortedRevisions.map((rev, idx) => {
                    const isActive = rev.id === currentActiveRevisionId;
                    const prev = idx > 0 ? sortedRevisions[idx - 1] : null;
                    const diff = prev ? rev.monthlyGrossSalary - prev.monthlyGrossSalary : 0;
                    const pct = prev && prev.monthlyGrossSalary > 0 ? Math.round((diff / prev.monthlyGrossSalary) * 1000) / 10 : 0;
                    const merged = mergeEarningsForDisplay({ basic: rev.basicSalary, hra: rev.hra, da: rev.da, specialAllowance: rev.specialAllowance, gross: rev.monthlyGrossSalary });

                    return (
                      <div key={rev.id} className={`border rounded-lg p-3 ${isActive ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{rev.reason || 'Salary Revision'}</span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                Effective {rev.effectiveDate}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold text-white bg-emerald-600 rounded px-1.5 py-0.5">
                                  CURRENT ACTIVE
                                </span>
                              )}
                            </div>
                            {prev && (
                              <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {diff >= 0 ? '+' : ''}₹{diff.toLocaleString('en-IN')} ({diff >= 0 ? '+' : ''}{pct}%)
                              </span>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              Basic: ₹{merged.basic.toLocaleString('en-IN')} &bull; HRA: ₹{merged.hra.toLocaleString('en-IN')} &bull; Special: ₹{merged.special.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-slate-800">₹{rev.monthlyGrossSalary.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-slate-400">/ month</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRevision(rev.id)}
                            disabled={deletingRevisionId === rev.id}
                            className="text-slate-400 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                            title="Delete revision"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : (employeeToEdit ? <><Save size={18} /> Update Employee</> : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
