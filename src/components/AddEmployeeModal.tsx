import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, Save, Calculator, Wallet, Building2, CreditCard } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeePayload: Omit<Employee, 'id'>) => void;
  employeeToEdit?: Employee | null;
}

// const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

// function getToken(): string | null {
//   return localStorage.getItem('lomaa_token');
// }

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSubmit, employeeToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: 'Engineering',
    joinDate: new Date().toISOString().split('T')[0],
    pan: '',
    basicSalary: '',
    hra: '',
    da: '',
    specialAllowance: '',
    bankAccountNumber: '',
    pfAccountNumber: '',
    esiNumber: ''
  });

  const [saving, setSaving] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (employeeToEdit) {
      setFormData({
        name: employeeToEdit.name ?? '',
        email: employeeToEdit.email ?? '',
        phone: employeeToEdit.phone ?? '',
        role: employeeToEdit.role ?? '',
        department: employeeToEdit.department ?? 'Engineering',
        joinDate: employeeToEdit.joinDate ?? new Date().toISOString().split('T')[0],
        pan: employeeToEdit.pan ?? '',
        basicSalary: employeeToEdit.basicSalary ? String(employeeToEdit.basicSalary) : '',
        hra: employeeToEdit.hra ? String(employeeToEdit.hra) : '',
        da: employeeToEdit.da ? String(employeeToEdit.da) : '',
        specialAllowance: employeeToEdit.specialAllowance ? String(employeeToEdit.specialAllowance) : '',
        bankAccountNumber: employeeToEdit.bankAccountNumber ?? '',
        pfAccountNumber: employeeToEdit.pfAccountNumber ?? '',
        esiNumber: employeeToEdit.esiNumber ?? ''
      });
      setTouched({});
      setErrors({});
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: 'Engineering',
        joinDate: new Date().toISOString().split('T')[0],
        pan: '',
        basicSalary: '',
        hra: '',
        da: '',
        specialAllowance: '',
        bankAccountNumber: '',
        pfAccountNumber: '',
        esiNumber: ''
      });
      setTouched({});
      setErrors({});
    }
  }, [isOpen, employeeToEdit]);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const validateField = (name: string, value: string) => {
    switch (name) {
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
      case 'pan':
        if (!value.trim()) return 'PAN is required';
        if (!PAN_REGEX.test(value.toUpperCase())) return 'PAN must be in format: AAAAA9999A';
        return '';
      case 'basicSalary':
        if (!value && value !== '0') return 'Basic salary is required';
        const basicNum = Number(value);
        if (isNaN(basicNum)) return 'Basic salary must be a number';
        if (basicNum <= 0) return 'Basic salary must be greater than 0';
        if (basicNum < 1000) return 'Basic salary must be at least ₹1,000';
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
    const requiredFields = ['name', 'email', 'phone', 'role', 'pan', 'basicSalary'];

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
      const payload: Omit<Employee, 'id'> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        joinDate: formData.joinDate,
        pan: formData.pan,
        basicSalary: formData.basicSalary ? Number(formData.basicSalary) : 0,
        hra: formData.hra ? Number(formData.hra) : 0,
        da: formData.da ? Number(formData.da) : 0,
        specialAllowance: formData.specialAllowance ? Number(formData.specialAllowance) : 0,
        bankAccountNumber: formData.bankAccountNumber,
        pfAccountNumber: formData.pfAccountNumber,
        esiNumber: formData.esiNumber
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const  name = e.target.name;
    let value = (e.target as HTMLInputElement).value;
       if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
     if (name === 'pan') {
      value = value.toUpperCase().slice(0, 10);
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

  const autoCalculateSalary = () => {
    const basic = Number(formData.basicSalary);
    if (!isNaN(basic) && basic > 0) {
      setFormData(prev => ({
        ...prev,
        hra: String(Math.round(basic * 0.40)), // 40% HRA
        da: String(Math.round(basic * 0.10)),  // 10% DA
        specialAllowance: String(Math.round(basic * 0.05)) || '0'
      }));
      setTouched(prev => ({ ...prev, hra: true, da: true, specialAllowance: true }));
    }
  };

  const isSubmitDisabled = saving || Object.keys(errors).length > 0;

  const showError = (field: string) => {
    return touched[field] && errors[field] ? errors[field] : '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold">{employeeToEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.name} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('name') && <p className="text-xs text-red-600 mt-1">{showError('name')}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Join Date *</label>
                  <input required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.joinDate} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('joinDate') && <p className="text-xs text-red-600 mt-1">{showError('joinDate')}</p>}

                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.email} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('email') && <p className="text-xs text-red-600 mt-1">{showError('email')}</p>}

                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input type="tel" inputMode="numeric" required name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.phone} maxLength={10} placeholder="Mobile number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('phone') && <p className="text-xs text-red-600 mt-1">{showError('phone')}</p>}

                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <input required name="role" value={formData.role} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.role} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('role') && <p className="text-xs text-red-600 mt-1">{showError('role')}</p>}

                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dept *</label>
                  <select required name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.department} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales">Sales</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                  {showError('department') && <p className="text-xs text-red-600 mt-1">{showError('department')}</p>}

                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN No *</label>
                  <input required name="pan" value={formData.pan} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.pan} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none uppercase text-sm" />
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
              <button
                type="button"
                onClick={autoCalculateSalary}
                className="text-emerald-600 text-xs font-bold hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                title="HRA = 40% Basic, DA = 10% Basic"
              >
                <Calculator size={14} /> Auto-Fill Allowances
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                  <input required type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.basicSalary} placeholder="0" className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('basicSalary') && <p className="text-xs text-red-600 mt-1">{showError('basicSalary')}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">House Rent Allowance (HRA)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                  <input type="number" name="hra" value={formData.hra} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.hra} placeholder="0" required className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('hra') && <p className="text-xs text-red-600 mt-1">{showError('hra')}</p>}

                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dearness Allowance (DA)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                  <input type="number" name="da" value={formData.da} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.da} placeholder="0" required className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('da') && <p className="text-xs text-red-600 mt-1">{showError('da')}</p>}

                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                  <input type="number" name="specialAllowance" value={formData.specialAllowance} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.specialAllowance} placeholder="0" required className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('specialAllowance') && <p className="text-xs text-red-600 mt-1">{showError('specialAllowance')}</p>}

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
                  <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.bankAccountNumber} placeholder="Optional" required className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  {showError('bankAccountNumber') && <p className="text-xs text-red-600 mt-1">{showError('bankAccountNumber')}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PF Account No</label>
                <input name="pfAccountNumber" value={formData.pfAccountNumber} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.pfAccountNumber} placeholder="Optional" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm uppercase" />
                {showError('pfAccountNumber') && <p className="text-xs text-red-600 mt-1">{showError('pfAccountNumber')}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ESI Number</label>
                <input name="esiNumber" value={formData.esiNumber} onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.esiNumber} placeholder="Optional" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                {showError('esiNumber') && <p className="text-xs text-red-600 mt-1">{showError('esiNumber')}</p>}
              </div>
            </div>
          </div>

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
