import React, { useEffect, useState } from 'react';
import { AdminNote } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/api';

import {
    Plus,
    Search,
    File,
    ChevronLeft,
    ChevronRight,
    X,
    Clock,
    Pin,
    PinOff,
    Trash2
} from 'lucide-react';

const categories = ['All', 'Note', 'Report', 'Update', 'Reminder'] as const;

export const DailyLogs: React.FC = () => {
    const [notes, setNotes] = useState<AdminNote[]>([]);

    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] =
        useState<typeof categories[number]>('All');

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMonth, setViewMonth] = useState(new Date());

    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] =
        useState<'Note' | 'Report' | 'Update' | 'Reminder'>('Note');


    useEffect(() => {
        load();
    }, []);

    async function load() {
        const data = await apiGet('/dailylogs');
        setNotes(data);
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const created = await apiPost('/dailylogs', {
            title,
            content,
            category
        });

        setNotes(prev => [created, ...prev]);
        setIsAdding(false);
        setTitle('');
        setContent('');
    };


    const onDeleteNote = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log entry?')) return;
        await apiDelete(`/dailylogs/${id}`);
        setNotes(prev => prev.filter(n => n.id !== id));
    };


    const onTogglePin = async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        const updated = await apiPut(`/dailylogs/${id}/pin`, {
            isPinned: !note.isPinned
        });

        setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
    };


    const renderCalendar = () => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const startDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days: React.ReactElement[] = [];

        for (let i = 0; i < startDay; i++) days.push(<div key={`b${i}`} />);

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);

            const same =
                selectedDate &&
                date.toDateString() === selectedDate.toDateString();

            const dateKey = date.toISOString().split('T')[0];

            const hasLogs = notes.some(
                n => n.createdAt.split('T')[0] === dateKey
            );

            days.push(
                <div key={d} className="flex flex-col items-center">
                    <button
                        onClick={() => setSelectedDate(same ? null : date)}
                        className={`h-9 w-9 rounded-lg text-sm font-medium
              ${same
                                ? 'bg-emerald-600 text-white'
                                : 'hover:bg-slate-100'
                            }`}
                    >
                        {d}
                    </button>

                    {hasLogs && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1" />
                    )}
                </div>
            );
        }

        return (
            <div className="bg-white border rounded-xl p-4">
                <div className="flex justify-between mb-2">
                    <button onClick={() => setViewMonth(new Date(year, month - 1))}>
                        <ChevronLeft />
                    </button>

                    <div className="font-semibold text-sm">
                        {viewMonth.toLocaleString('default', { month: 'long' })}{' '}
                        {year}
                    </div>

                    <button onClick={() => setViewMonth(new Date(year, month + 1))}>
                        <ChevronRight />
                    </button>
                </div>

                <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d}>{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">{days}</div>
            </div>
        );
    };


    const filtered = notes.filter(n => {
        const matchCat =
            selectedCategory === 'All' || n.category === selectedCategory;

        const matchSearch =
            n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase());

        const matchDate =
            !selectedDate ||
            new Date(n.createdAt).toDateString() ===
            selectedDate?.toDateString();

        return matchCat && matchSearch && matchDate;
    }).sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

    const categoryCounts: Record<string, number> = {
        All: notes.length,
        Note: notes.filter(n => n.category === 'Note').length,
        Report: notes.filter(n => n.category === 'Report').length,
        Update: notes.filter(n => n.category === 'Update').length,
        Reminder: notes.filter(n => n.category === 'Reminder').length
    };

    return (
        <div className="space-y-5">

            <div className="bg-white border rounded-xl p-5 flex flex-col sm:flex-row sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">
                        Daily Logs & Reminders
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Keep track of internal updates, reports, and reminders.
                    </p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-emerald-600 text-white rounded-lg px-4 py-2 shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <Plus size={16} /> New Log Entry
                </button>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-4">
                    {renderCalendar()}


                    <div className="bg-white border rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                            CATEGORIES
                        </p>

                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full flex justify-between px-3 py-2 rounded-lg text-sm mb-1
                  ${selectedCategory === cat
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                                <span className="text-xs opacity-70">
                                    {categoryCounts[cat]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>


                <div className="md:col-span-3 space-y-4">

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            className="w-full border rounded-xl px-12 py-2"
                            placeholder="Search in logs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>


                    <div className="border border-dashed rounded-xl min-h-[280px] flex items-center justify-center">
                        {filtered.length === 0 ? (
                            <div className="text-center text-slate-400">
                                <File size={42} className="mx-auto mb-2 opacity-40" />
                                <p className="font-medium">
                                    No log entries found for these filters.
                                </p>
                                <p className="text-xs">
                                    Try adjusting your search or selecting another date.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full p-4 grid md:grid-cols-2 gap-3">
                                {filtered.map(n => (
                                    <div
                                        key={n.id}
                                        className="bg-white rounded-2xl shadow-sm border p-5"
                                    >
                                        <div className="flex justify-between">
                                            <span className="px-2 py-1 text-[11px] rounded-md bg-blue-100 text-blue-700 font-semibold uppercase">
                                                {n.category}
                                            </span>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => onTogglePin(n.id)}
                                                    className="text-slate-500 hover:text-emerald-600"
                                                >
                                                    {n.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                                </button>

                                                <button
                                                    onClick={() => onDeleteNote(n.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="mt-2 font-semibold text-lg">
                                            {n.title}
                                        </h3>

                                        <p className="text-slate-600 text-sm">
                                            {n.content}
                                        </p>

                                        <div className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(n.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {isAdding && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">

                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold">
                                <span className="text-lg">＋</span>
                                Add Log Entry
                            </div>

                            <button
                                onClick={() => setIsAdding(false)}
                                className="text-slate-300 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>


                        <div className="p-6 space-y-4">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="text-sm font-semibold">Title</label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2 mt-1"
                                        placeholder="Summary of the update..."
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Category</label>
                                    <div>
                                        <select
                                            className="w-1/3 border rounded-lg px-3 py-2 mt-1"
                                            value={category}
                                            onChange={e =>
                                                setCategory(e.target.value as any)
                                            }
                                        >
                                            <option value="Report">Formal Report</option>
                                            <option value="Note">General Note</option>
                                            <option value="Update">Status Update</option>
                                            <option value="Reminder">Reminder</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">Content</label>
                                    <textarea
                                        className="w-full border rounded-lg px-3 py-2 mt-1"
                                        rows={5}
                                        placeholder="Detail the entry here..."
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 text-lg font-semibold shadow"
                                >
                                    Save Entry
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
