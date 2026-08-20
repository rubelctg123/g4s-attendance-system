import React, { useState } from 'react';
import { G4SEmployee } from '../types';
import { Users, Plus, Edit, Trash2, Shield, Search, Check, X, AlertTriangle, Lock } from 'lucide-react';

interface EmployeeMasterProps {
  employees: G4SEmployee[];
  onSaveEmployee: (emp: G4SEmployee) => Promise<void>;
  onDeleteEmployee: (id: string, empId: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  canDelete?: boolean;
}

export const EmployeeMaster: React.FC<EmployeeMasterProps> = ({
  employees,
  onSaveEmployee,
  onDeleteEmployee,
  isAddModalOpen,
  setIsAddModalOpen,
  canDelete = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<G4SEmployee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<G4SEmployee | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<Partial<G4SEmployee>>({
    employee_id: '',
    name: '',
    job_title: 'Security Guard (G4S)',
    category: 'Worker',
    join_date: new Date().toISOString().split('T')[0],
    inactive_date: '',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Main Gate',
    active: true,
  });

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.category && e.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setSaveError(null);
    setFormData({
      employee_id: `050${Math.floor(10000 + Math.random() * 90000)}`,
      name: '',
      job_title: 'Security Guard (G4S)',
      category: 'Worker',
      join_date: new Date().toISOString().split('T')[0],
      inactive_date: '',
      business_unit: 'Security (G4S)',
      company_name: 'Vancot Limited.',
      line: 'Main Gate',
      active: true,
    });
    setEditingEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: G4SEmployee) => {
    setSaveError(null);
    setFormData({
      ...emp,
      category: emp.category || 'Worker',
      inactive_date: emp.inactive_date || '',
    });
    setEditingEmployee(emp);
    setIsAddModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEmp) return;
    setIsDeleting(true);
    try {
      await onDeleteEmployee(deleteConfirmEmp.id, deleteConfirmEmp.employee_id);
      setDeleteConfirmEmp(null);
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.name) return;
    setSaveError(null);
    setIsSubmitting(true);

    const empToSave: G4SEmployee = {
      id: editingEmployee ? editingEmployee.id : `emp-${Date.now()}`,
      employee_id: formData.employee_id.trim(),
      name: formData.name.trim(),
      job_title: formData.job_title || 'Security Guard (G4S)',
      category: (formData.category as 'Worker' | 'Staff') || 'Worker',
      join_date: formData.join_date || new Date().toISOString().split('T')[0],
      inactive_date: formData.active ? '' : (formData.inactive_date || new Date().toISOString().split('T')[0]),
      business_unit: formData.business_unit || 'Security (G4S)',
      company_name: formData.company_name || 'Vancot Limited.',
      line: formData.line || 'Main Gate',
      active: formData.active !== undefined ? formData.active : true,
    };

    try {
      await onSaveEmployee(empToSave);
      setIsAddModalOpen(false);
      setEditingEmployee(null);
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setSaveError(err.message || 'Failed to save employee to Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">G4S Employee Master</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage G4S security guards deployed at Vancot Limited factory</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 w-full sm:w-64"
            />
          </div>

          <button
            id="add-new-employee-btn"
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm flex items-center space-x-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add G4S Guard</span>
          </button>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-xs border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Business Unit</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Duty Post / Line</th>
                <th className="px-4 py-3">Join Date</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No security staff matching search query.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{emp.job_title}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.category === 'Staff'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {emp.category || 'Worker'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.business_unit}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.company_name}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.line || 'Main Gate'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{emp.join_date}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          emp.active ? 'bg-[#dcfce7] text-[#166534]' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                      {!emp.active && emp.inactive_date && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5" title="Inactive Date">
                          {emp.inactive_date}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit employee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {canDelete ? (
                        <button
                          onClick={() => setDeleteConfirmEmp(emp)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="inline-block p-1.5 text-slate-300 cursor-not-allowed"
                          title="Delete option restricted to Admin"
                        >
                          <Lock className="w-4 h-4 text-slate-300" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Deletion Confirmation Modal (Safe for iframe) */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Employee Record</h3>
              <p className="text-xs text-slate-600 mt-2">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-slate-900">{deleteConfirmEmp.name}</span> (ID:{' '}
                <span className="font-mono font-bold text-slate-900">{deleteConfirmEmp.employee_id}</span>)?
              </p>
              <p className="text-[11px] text-rose-600 font-medium mt-1">
                This will delete the guard master record and all associated attendance records.
              </p>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmEmp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-md shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  {editingEmployee ? 'Edit G4S Security Guard' : 'Add New G4S Security Guard'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {saveError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Failed to Save Employee</p>
                    <p className="text-[11px] leading-relaxed text-rose-700">{saveError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id || ''}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                    placeholder="e.g. 05016666"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                    placeholder="e.g. Md. Rabin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  <select
                    value={formData.job_title || ''}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="Security Supervisor (G4S)">Security Supervisor (G4S)</option>
                    <option value="Assistant Supervisor (G4S)">Assistant Supervisor (G4S)</option>
                    <option value="Security Guard (G4S)">Security Guard (G4S)</option>
                    <option value="Jr. Security Guard (G4S)">Jr. Security Guard (G4S)</option>
                    <option value="Female Security Guard (G4S)">Female Security Guard (G4S)</option>
                    <option value="Armed Security Guard (G4S)">Armed Security Guard (G4S)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category || 'Worker'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'Worker' | 'Staff' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="Worker">Worker (OT Allowed)</option>
                    <option value="Staff">Staff (No OT / OT = 0)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Join Date</label>
                  <input
                    type="date"
                    value={formData.join_date || ''}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Duty Post / Line</label>
                  <input
                    type="text"
                    value={formData.line || ''}
                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                    placeholder="e.g. Main Gate / KEPZ Gate 2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Business Unit</label>
                  <input
                    type="text"
                    value={formData.business_unit || 'Security (G4S)'}
                    onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name || 'Vancot Limited.'}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emp-active-check"
                    checked={formData.active}
                    onChange={(e) => {
                      const isActive = e.target.checked;
                      setFormData({
                        ...formData,
                        active: isActive,
                        inactive_date: isActive ? '' : formData.inactive_date || new Date().toISOString().split('T')[0],
                      });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="emp-active-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Employee is Active
                  </label>
                </div>

                {!formData.active && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1">
                    <label className="block text-[11px] font-bold text-rose-800 uppercase">
                      Inactive Date / Resignation Date *
                    </label>
                    <input
                      type="date"
                      required={!formData.active}
                      value={formData.inactive_date || ''}
                      onChange={(e) => setFormData({ ...formData, inactive_date: e.target.value })}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
