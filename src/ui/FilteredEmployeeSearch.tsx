 import React from 'react';
import { Search, Plus } from 'lucide-react';

interface Props {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
   showAdd?: boolean;
  onAddClick?: () => void;
   showSecondary?: boolean;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  secondaryLoading?: boolean;
   containerClassName?: string;
  inputWidthClass?: string;  
  placeholder?: string;
}

export const FilteredEmployeeSearch: React.FC<Props> = ({
  searchTerm,
  setSearchTerm,
  showAdd = false,
  onAddClick,
  showSecondary = false,
  secondaryLabel = 'Action',
  onSecondaryClick,
  secondaryLoading = false,
  containerClassName = '',
  inputWidthClass = 'w-full',
  placeholder = 'Search employees...'
}) => {
  return (
    <div className={`relative ${containerClassName}`}>
      <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${inputWidthClass} pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all`}
        />
        {showSecondary && (
          <button
            onClick={onSecondaryClick}
            className="text-sm px-3 py-2 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2"
            disabled={secondaryLoading}
          >
            {secondaryLoading ? 'Loading…' : secondaryLabel}
          </button>
        )}

        {showAdd && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
            title="Add"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FilteredEmployeeSearch;
