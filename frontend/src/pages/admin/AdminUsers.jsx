// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminUsers = () => {
  const { token, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Edit Modal State
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });

  // Anonymize confirmation modal
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [token, page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page,
        limit,
        search,
        role: roleFilter,
        status: statusFilter
      });
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch user directory.");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError("Error loading users from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (email, newStatus) => {
    if (email === currentAdmin?.email && newStatus !== "active") {
      alert("You cannot suspend your own administrative account.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${email}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update status.");
      } else {
        setMessage(`Account status updated to ${newStatus}.`);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Server error updating status.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name || u.username, phone: u.phone || "" });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${editUser.email}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Update failed.");
      } else {
        setMessage("User profile updated successfully.");
        setEditUser(null);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnonymizeUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      setActionLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${confirmDeleteUser.email}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Anonymization failed.");
      } else {
        setMessage("User account successfully anonymized and deactivated.");
        setConfirmDeleteUser(null);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Error anonymizing user account.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case "pending":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case "suspended":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Suspended</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Inactive</span>;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-white">Administrator</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Patient</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users size={26} className="text-blue-600" /> User Directory & Access Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage user accounts, toggle permissions, update profiles, and perform safe anonymization
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh List
        </button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" /> {message}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600" /> {error}
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="patient">Patients</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Approval</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching users found in database.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                          {(u.full_name || u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{u.full_name || u.username}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail size={11} /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {u.phone ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone size={12} className="text-slate-400" /> {u.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not provided</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.role)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(u.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {u.created_at ? u.created_at.substring(0, 10) : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status Toggle Buttons */}
                        {u.status === "active" ? (
                          <button
                            onClick={() => handleStatusChange(u.email, "suspended")}
                            disabled={actionLoading}
                            title="Suspend Account"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <UserX size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(u.email, "active")}
                            disabled={actionLoading}
                            title="Activate Account"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <UserCheck size={15} />
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit Profile"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Anonymize / Delete Button */}
                        {u.email !== currentAdmin?.email && (
                          <button
                            onClick={() => setConfirmDeleteUser(u)}
                            title="Safe Anonymization"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {users.length} of {total} registered users</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={users.length < limit}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800">Edit User Details</h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Read Only)</label>
                <input
                  type="email"
                  value={editUser.email}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (10 digits)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Anonymize Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Safe Account Anonymization</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to anonymize and deactivate the account for{" "}
              <span className="font-bold text-slate-800">{confirmDeleteUser.email}</span>?
              Personal identifiers will be securely masked, while required medical predictions and audit logs are safely preserved.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnonymizeUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                Confirm Anonymization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
