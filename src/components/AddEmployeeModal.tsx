import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, Save, Calculator, Wallet, Building2, CreditCard } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeePayload: Omit<Employee, 'id'> & { id: string }) => void;
  employeeToEdit?: Employee | null;
}

// const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

// function getToken(): string | null {
//   return localStorage.getItem('lomaa_token');
// }

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSubmit, employeeToEdit }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    department: 'Engineering',
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

  useEffect(() => {
    if (!isOpen) return;
    if (employeeToEdit) {
      setFormData({
        id: employeeToEdit.id ?? '',
        name: employeeToEdit.name ?? '',
        email: employeeToEdit.email ?? '',
        phone: employeeToEdit.phone ?? '',
        role: employeeToEdit.role ?? '',
        department: employeeToEdit.department ?? 'Engineering',
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
      setTouched({});
      setErrors({});
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        phone: '',
        role: '',
        department: 'Engineering',
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
      setTouched({});
      setErrors({});
    }
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
    const requiredFields = ['id', 'name', 'email', 'phone', 'role', 'pan', 'monthlyGrossSalary', 'basicSalary'];

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <input required name="role" value={formData.role} placeholder="Role" onChange={handleChange} onBlur={handleBlur} aria-invalid={!!errors.role} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
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
                    <option value="AI Engineering">AI Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Administration">Administration</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Driver">Driver</option>
                  </select>
                  {showError('department') && <p className="text-xs text-red-600 mt-1">{showError('department')}</p>}

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

              {/* Salary Inputs */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
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
