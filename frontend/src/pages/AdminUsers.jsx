import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import ConfirmDialog from '../components/ConfirmDialog';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Dialog state
  const [actionDialog, setActionDialog] = useState(null); // { type: 'status' | 'role', user, targetValue }
  const [actionLoading, setActionLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.isActive = statusFilter;

      const response = await adminService.getUsers(params);
      setUsers(response.data || []);
      if (response.meta) {
        setPagination(response.meta);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch user list', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePromptStatusToggle = (targetUser) => {
    const nextStatus = !targetUser.isActive;
    setActionDialog({
      type: 'status',
      user: targetUser,
      targetValue: nextStatus,
      title: nextStatus ? 'Activate User Account' : 'Deactivate User Account',
      message: nextStatus
        ? `Are you sure you want to reactivate the account for "${targetUser.name}" (${targetUser.email})?`
        : `Are you sure you want to deactivate the account for "${targetUser.name}" (${targetUser.email})? They will be barred from logging in.`,
      confirmText: nextStatus ? 'Activate Account' : 'Deactivate Account',
      confirmVariant: nextStatus ? 'success' : 'danger',
    });
  };

  const handlePromptRoleToggle = (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setActionDialog({
      type: 'role',
      user: targetUser,
      targetValue: nextRole,
      title: nextRole === 'admin' ? 'Promote User to Administrator' : 'Demote Administrator to Regular User',
      message: `Are you sure you want to change the role of "${targetUser.name}" to ${nextRole.toUpperCase()}?`,
      confirmText: nextRole === 'admin' ? 'Promote to Admin' : 'Demote to User',
      confirmVariant: nextRole === 'admin' ? 'primary' : 'danger',
    });
  };

  const handleConfirmAction = async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      if (actionDialog.type === 'status') {
        await adminService.updateUserStatus(actionDialog.user._id, actionDialog.targetValue);
        showToast(`User successfully ${actionDialog.targetValue ? 'activated' : 'deactivated'}`);
      } else if (actionDialog.type === 'role') {
        await adminService.updateUserRole(actionDialog.user._id, actionDialog.targetValue);
        showToast(`User role successfully updated to ${actionDialog.targetValue}`);
      }
      setActionDialog(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>User Administration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage user accounts, toggle access, and adjust system permissions with automated last-admin safeguards
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="toolbar-card" style={{ marginBottom: '1.5rem' }}>
        <div className="filters-wrapper">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <label htmlFor="admin-search-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
              Search users by name or email
            </label>
            <input
              id="admin-search-input"
              type="text"
              className="search-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <label htmlFor="admin-role-filter" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Filter by Role
          </label>
          <select
            id="admin-role-filter"
            className="select-filter"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="user">Regular Users</option>
            <option value="admin">Administrators</option>
          </select>

          <label htmlFor="admin-status-filter" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Filter by Status
          </label>
          <select
            id="admin-status-filter"
            className="select-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>

          {(search || roleFilter || statusFilter !== '') && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}
              className="btn btn-secondary btn-sm"
              id="btn-admin-reset-filters"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state" style={{ margin: '2rem' }}>
            <div className="empty-state-icon">👥</div>
            <h2 className="empty-state-title">No users found</h2>
            <p className="empty-state-desc">Try clearing your search query or filters.</p>
          </div>
        ) : (
          <table className="admin-table" id="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} id={`user-row-${u._id}`}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`user-role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-indicator ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                      <span className="status-dot" />
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handlePromptStatusToggle(u)}
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                        id={`btn-toggle-status-${u._id}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handlePromptRoleToggle(u)}
                        className="btn btn-secondary btn-sm"
                        id={`btn-toggle-role-${u._id}`}
                      >
                        {u.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} registered users)
          </div>
          <div className="pagination-actions">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="btn btn-secondary btn-sm"
              id="btn-admin-pagination-prev"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="btn btn-secondary btn-sm"
              id="btn-admin-pagination-next"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(actionDialog)}
        title={actionDialog?.title}
        message={actionDialog?.message}
        confirmText={actionDialog?.confirmText}
        confirmVariant={actionDialog?.confirmVariant}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setActionDialog(null)}
      />

      {/* Feedback Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`} id="admin-toast">
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
