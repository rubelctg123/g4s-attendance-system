import React, { useState, useRef, useEffect, useMemo } from 'react';
import { G4SEmployee } from '../types';
import { Search, ChevronDown, Check, X, User, Shield, Briefcase } from 'lucide-react';

interface SearchableEmployeeSelectProps {
  employees: G4SEmployee[];
  selectedEmployeeId: string;
  onSelectEmployee: (empId: string) => void;
  label?: string;
  id?: string;
  className?: string;
}

export const SearchableEmployeeSelect: React.FC<SearchableEmployeeSelectProps> = ({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  label = 'Select Employee',
  id = 'searchable-employee-select',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.employee_id === selectedEmployeeId) || employees[0],
    [employees, selectedEmployeeId]
  );

  // Filter employees based on search query (ID, Name, Job Title, Line)
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        emp.employee_id.toLowerCase().includes(q) ||
        emp.name.toLowerCase().includes(q) ||
        (emp.job_title && emp.job_title.toLowerCase().includes(q)) ||
        (emp.line && emp.line.toLowerCase().includes(q)) ||
        (emp.category && emp.category.toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredEmployees.length > 0) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredEmployees.length]);

  const handleSelect = (empId: string) => {
    onSelectEmployee(empId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredEmployees.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredEmployees[highlightedIndex]) {
        handleSelect(filteredEmployees[highlightedIndex].employee_id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] text-slate-400 font-medium">
            {employees.length} Guards Enrolled
          </span>
        </div>
      )}

      {/* Main Select Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full bg-slate-50 hover:bg-slate-100/80 border text-left rounded-lg p-2.5 flex items-center justify-between transition-all outline-none ${
          isOpen
            ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
            : 'border-slate-200 text-slate-800'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedEmployee ? (
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black font-mono tracking-tight bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              {selectedEmployee.employee_id}
            </span>
            <span className="font-bold text-xs text-slate-900 truncate">
              {selectedEmployee.name}
            </span>
            {!selectedEmployee.active && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                Inactive {selectedEmployee.inactive_date ? `(${selectedEmployee.inactive_date})` : ''}
              </span>
            )}
            <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
              • {selectedEmployee.job_title}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Choose an employee...</span>
        )}

        <div className="flex items-center space-x-1 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[320px] max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-100">
          {/* Search Input Box */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search by ID (e.g. 05016666) or Name..."
                className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
                <span>
                  Found <strong className="text-emerald-700">{filteredEmployees.length}</strong> matching guards
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-emerald-600 hover:underline font-semibold"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Results List */}
          <ul
            ref={listRef}
            className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1 focus:outline-none"
            role="listbox"
          >
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, index) => {
                const isSelected = emp.employee_id === selectedEmployeeId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={emp.employee_id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(emp.employee_id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isHighlighted
                        ? 'bg-emerald-50/80 text-emerald-950'
                        : isSelected
                        ? 'bg-slate-50 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* ID Badge */}
                      <span
                        className={`font-mono text-[11px] font-black px-2 py-0.5 rounded border shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isHighlighted
                            ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {emp.employee_id}
                      </span>

                      {/* Name and Info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {emp.name}
                          </span>
                          {!emp.active && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center space-x-2 mt-0.5">
                          <span>{emp.job_title}</span>
                          {emp.line && <span>• {emp.line}</span>}
                          {emp.category && <span>• {emp.category}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right selection checkmark */}
                    {isSelected && (
                      <div className="shrink-0 text-emerald-600">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="p-6 text-center text-xs text-slate-500">
                <Shield className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No security guard found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No employee matches &ldquo;{searchQuery}&rdquo; by ID or name
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold transition-colors"
                >
                  View All Employees
                </button>
              </li>
            )}
          </ul>

          {/* Footer Info */}
          <div className="p-2 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 px-3">
            <span>Use ↑ ↓ keys to navigate, Enter to select</span>
            <span>Total: {employees.length} Guards</span>
          </div>
        </div>
      )}
    </div>
  );
};
