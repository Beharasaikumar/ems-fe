
import React, { useState, useEffect } from 'react';
import { Bill } from '../types';
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete
} from '../api/api';

import { 
  ReceiptIndianRupee, 
  Plus, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Upload
} from 'lucide-react';

export const BillManager: React.FC = () => {
 const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] =
    useState<'All' | 'Pending' | 'Paid' | 'Rejected'>('All');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Bill['category']>('Utilities');
  const [billDate, setBillDate] =
    useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

   useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await apiGet('/bills');
      setBills(data);
      setLoading(false);
    }
    load();
  }, []);

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let fileData = '';
    let fileName = '';

    if (file) {
      fileName = file.name;
      fileData = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const created = await apiPost('/bills', {
      title,
      amount,
      category,
      billDate,
      fileData,
      fileName
    });

    setBills(prev => [created, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory('Utilities');
    setBillDate(new Date().toISOString().split('T')[0]);
    setFile(null);
    setIsAdding(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

   const updateStatus = async (id: string, status: Bill['status']) => {
    const updated = await apiPut(`/bills/${id}/status`, { status });
    setBills(prev => prev.map(b => (b.id === id ? updated : b)));
  };

   const deleteBill = async (id: string) => {
    if (!window.confirm('Delete this bill?')) return;
    await apiDelete(`/bills/${id}`);
    setBills(prev => prev.filter(b => b.id !== id));
  };

   const openFile = (data?: string) => {
    if (!data) return alert('No attachment');
    const w = window.open();
    if (w) w.document.write(`<iframe src="${data}" style="width:100%;height:100%"></iframe>`);
  };

  const filteredBills = bills.filter(b => {
    const match =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const filterMatch = filter === 'All' || b.status === filter;
    return match && filterMatch;
  });

  const totals = {
    total: bills.reduce((a, b) => a + Number(b.amount), 0),
    pending: bills.filter(b => b.status === 'Pending').reduce((a, b) => a + Number(b.amount), 0),
    paid: bills.filter(b => b.status === 'Paid').reduce((a, b) => a + Number(b.amount), 0)
  };


  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ReceiptIndianRupee className="text-emerald-600" />
              Bill Management
            </h2>
            <p className="text-slate-500 mt-1 text-sm">Upload and track office bills, invoices, and utilities.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 font-bold"
          >
            <Plus size={18} /> Upload New Bill
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full xl:w-1/3">
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bills</p>
             <p className="text-xl font-bold text-slate-800 mt-1">₹{totals.total.toLocaleString()}</p>
           </div>
           <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
             <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending</p>
             <p className="text-xl font-bold text-amber-700 mt-1">₹{totals.pending.toLocaleString()}</p>
           </div>
           <div className="hidden md:block bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
             <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Paid</p>
             <p className="text-xl font-bold text-emerald-700 mt-1">₹{totals.paid.toLocaleString()}</p>
           </div>
        </div>
      </div>

       <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search bills by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
          />
        </div>
        <div className="flex bg-white rounded-lg border border-slate-300 p-1">
          {['All', 'Pending', 'Paid', 'Rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${filter === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Bill Info</th>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Category</th>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Amount</th>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Date</th>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
              <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBills.map(bill => (
              <tr key={bill.id} className="hover:bg-slate-50 group transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{bill.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{bill.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {bill.category}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-bold text-slate-800">₹{bill.amount.toLocaleString()}</span>
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {bill.billDate}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {bill.status === 'Paid' && <CheckCircle2 size={14} className="text-emerald-500" />}
                    {bill.status === 'Pending' && <Clock size={14} className="text-amber-500" />}
                    {bill.status === 'Rejected' && <XCircle size={14} className="text-red-500" />}
                    <span className={`text-xs font-bold ${
                      bill.status === 'Paid' ? 'text-emerald-600' :
                      bill.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openFile(bill.fileData)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="View Attachment"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <select 
                      value={bill.status}
                      onChange={(e) => updateStatus(bill.id, e.target.value as any)}
                      className="text-xs border border-slate-200 rounded p-1 bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Pending">Mark Pending</option>
                      <option value="Paid">Mark Paid</option>
                      <option value="Rejected">Mark Rejected</option>
                    </select>
                    <button 
                      onClick={() => deleteBill(bill.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Bill"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBills.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <ReceiptIndianRupee size={40} className="mx-auto mb-4 opacity-10" />
                  <p>No bills found. Start by uploading an invoice!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

       {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Plus size={18} /> Upload New Bill</h3>
              <button onClick={resetForm} className="hover:bg-slate-800 p-1 rounded-full"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Title / Invoice Ref *</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Electricity Bill..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (INR) *</label>
                  <input 
                    required
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date *</label>
                  <input 
                    required
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="Utilities">Utilities (Water, Electricity)</option>
                  <option value="Rent">Rent & Infrastructure</option>
                  <option value="Travel">Business Travel</option>
                  <option value="Supplies">Office Supplies</option>
                  <option value="Hardware">IT Hardware</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attachment (Image/PDF)</label>
                <div className="relative border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-colors flex flex-col items-center justify-center gap-2 group cursor-pointer">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload size={24} className="text-slate-400 group-hover:text-emerald-500" />
                  <p className="text-xs text-slate-500">{file ? file.name : "Click or drag file to upload"}</p>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                <ArrowUpRight size={18} /> Save & Record Bill
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
