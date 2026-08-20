import React, { useState, useEffect } from 'react';
import { PortalUser, UserRole, UserAccountStatus } from '../types';
import {
  fetchPortalUsers,
  savePortalUser,
  deletePortalUser,
  togglePortalUserStatus,
} from '../lib/users';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  User,
  Key,
  ShieldCheck,
  Crown,
  Ban,
  RefreshCw,
  X,
} from 'lucide-react';

interface UserManagementProps {
  currentUser: PortalUser | null;
  onRefreshSession?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onRefreshSession }) => {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    password: '',
    role: 'hr_officer' as UserRole,
    status: 'active' as UserAccountStatus,
    can_delete: false,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchPortalUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormError(null);
    setFormData({
      user_id: `hr.${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      email: '',
      password: 'User@2026',
      role: 'hr_officer',
      status: 'active',
      can_delete: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: PortalUser) => {
    setEditingUser(user);
    setFormError(null);
    setFormData({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      password: '', // blank unless changing
      role: user.role,
      status: user.status,
      can_delete: user.role === 'admin' ? true : user.can_delete,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.email.trim() || !formData.name.trim() || !formData.user_id.trim()) {
      setFormError('User ID, Name, and Email are required.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setFormError('Password is required for new accounts.');
      return;
    }

    setSubmitting(true);
    try {
      const userToSave: PortalUser = {
        id: editingUser ? editingUser.id : `usr-${Date.now()}`,
        user_id: formData.user_id.trim().toLowerCase(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        can_delete: formData.role === 'admin' ? true : formData.can_delete,
        created_at: editingUser ? editingUser.created_at : new Date().toISOString(),
        last_login: editingUser?.last_login,
      };

      if (formData.password.trim()) {
        userToSave.password = formData.password.trim();
      } else if (editingUser?.password) {
        userToSave.password = editingUser.password;
      }

      await savePortalUser(userToSave);
      await loadUsers();
      setIsModalOpen(false);
      showToast(
        editingUser
          ? `User "${userToSave.name}" updated successfully.`
          : `New user "${userToSave.name}" added successfully.`
      );

      if (onRefreshSession && currentUser?.id === userToSave.id) {
        onRefreshSession();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: PortalUser) => {
    const nextStatus: UserAccountStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await togglePortalUserStatus(user.id, nextStatus);
      await loadUsers();
      showToast(
        `User "${user.name}" status changed to ${nextStatus === 'active' ? 'ACTIVE' : 'DISABLED'}.`
      );
      if (onRefreshSession && currentUser?.id === user.id) {
        onRefreshSession();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status.');
    }
  };

  const handleDelete = async (user: PortalUser) => {
    if (user.role === 'admin' && user.email === 'admin@vancot.com') {
      alert('The root Administrator account cannot be deleted.');
      return;
    }

    if (currentUser && currentUser.id === user.id) {
      alert('You cannot delete your own currently active logged-in account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      await deletePortalUser(user.id, user.email);
      await loadUsers();
      showToast(`User "${user.name}" has been deleted.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const staffCount = users.filter((u) => u.role !== 'admin' && u.status === 'active').length;
  const disabledCount = users.filter((u) => u.status === 'disabled').length;

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            User administration, security credentials, and role privilege management are reserved exclusively for System Administrators.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Your current role:</span>
            <strong className="text-slate-800 capitalize">{currentUser?.role || 'Staff'}</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Role-Based Access Control Explanatory Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>User Role & Security Access Control</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Admin Exclusive
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Control who can access the portal and what operations they can perform. Only users with the{' '}
                <strong className="text-emerald-400">Admin</strong> role have permission to delete security guard
                records and configure user access. Other roles have delete privileges strictly disabled.
              </p>
            </div>
          </div>

          <button
            id="add-portal-user-btn"
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Users</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalUsers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Admins (Full Access)</span>
            <Crown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{adminCount}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Can delete & edit users</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase">Staff (No Delete)</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-1">{staffCount}</p>
          <p className="text-[11px] text-indigo-600/80 mt-0.5">Standard HR Officers</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Disabled Accounts</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">{disabledCount}</p>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Blocked from login</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by User ID, Name, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="hr_officer">HR Officers Only</option>
            <option value="viewer">Viewers Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="disabled">Disabled Accounts</option>
          </select>

          <button
            onClick={loadUsers}
            title="Refresh user list"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-xs border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Full Name & Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Delete Privileges</th>
                <th className="px-4 py-3 text-center">Account Status</th>
                <th className="px-4 py-3">Created / Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const isRootAdmin = user.email.toLowerCase() === 'admin@vancot.com';
                  const isAdmin = user.role === 'admin';

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        user.status === 'disabled' ? 'bg-rose-50/40 text-slate-400' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          {isAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span>{user.user_id}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{user.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : user.role === 'hr_officer'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span>
                            {user.role === 'admin'
                              ? 'Administrator'
                              : user.role === 'hr_officer'
                              ? 'HR Officer'
                              : 'Viewer'}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {user.role === 'admin' || user.can_delete ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isRootAdmin}
                          title={
                            isRootAdmin
                              ? 'Root Admin cannot be disabled'
                              : `Click to ${user.status === 'active' ? 'disable' : 'enable'} user`
                          }
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform active:scale-95 ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                              : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800'
                          } ${isRootAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span className="capitalize">{user.status}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        <div className="text-[11px] font-medium">
                          Created: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        {user.last_login && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Last: {new Date(user.last_login).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit User & Roles"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isRootAdmin || isCurrent}
                          className={`p-1.5 rounded-md transition-colors ${
                            isRootAdmin || isCurrent
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={
                            isRootAdmin
                              ? 'Cannot delete Root Admin'
                              : isCurrent
                              ? 'Cannot delete your own account'
                              : 'Delete User Account'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New Portal User'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Validation Error</p>
                    <p className="text-[11px] text-rose-700">{formError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    User ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    placeholder="e.g. hr.officer1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. hr.officer@vancot.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {editingUser ? 'Reset Password (leave blank to keep current)' : 'Account Password *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormData({
                        ...formData,
                        role: newRole,
                        can_delete: newRole === 'admin' ? true : false,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="admin">Administrator (Full Access + Delete)</option>
                    <option value="hr_officer">HR Officer (Manage Attendance - No Delete)</option>
                    <option value="viewer">Viewer (Read Only - No Delete)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Account Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as UserAccountStatus })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  >
                    <option value="active">Active (Can Sign In)</option>
                    <option value="disabled">Disabled (Login Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Role Permissions Preview Box */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Effective Permissions for {formData.role.toUpperCase()}</span>
                </div>
                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        formData.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      <strong>Delete Employees:</strong>{' '}
                      {formData.role === 'admin' ? (
                        <span className="text-emerald-700 font-bold">Allowed</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Strictly Restricted (Admin Only)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        formData.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      <strong>User & Role Management:</strong>{' '}
                      {formData.role === 'admin' ? (
                        <span className="text-emerald-700 font-bold">Full Control</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Locked</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      <strong>Job Cards & Attendance Calculations:</strong>{' '}
                      <span className="text-emerald-700 font-bold">
                        {formData.role === 'viewer' ? 'View & Export' : 'Full Edit & Calculate'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
