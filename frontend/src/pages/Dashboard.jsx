import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import taskService from '../services/taskService';
import DashboardSummary from '../components/DashboardSummary';
import TaskFilters from '../components/TaskFilters';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import ConfirmDialog from '../components/ConfirmDialog';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modal & Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await taskService.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;

      const response = await taskService.getTasks(params);
      setTasks(response.data || []);
      if (response.meta) {
        setPagination(response.meta);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, sortBy, sortOrder]);

  const [searchParams, setSearchParams] = useSearchParams();
  const targetTaskId = searchParams.get('taskId');

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (targetTaskId) {
      const handleTargetTask = async () => {
        try {
          const el = document.getElementById(`task-card-${targetTaskId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('task-card-highlighted');
            setTimeout(() => el.classList.remove('task-card-highlighted'), 3000);
          } else {
            const res = await taskService.getTaskById(targetTaskId);
            if (res.data) {
              setEditingTask(res.data);
              setIsModalOpen(true);
            }
          }
        } catch (err) {
          console.warn('Could not focus target task:', err);
        }
      };
      handleTargetTask();
    }
  }, [targetTaskId, tasks]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      await taskService.updateTask(editingTask._id, taskData);
      showToast('Task updated successfully');
    } else {
      await taskService.createTask(taskData);
      showToast('Task created successfully');
    }
    fetchTasks();
    fetchStats();
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      showToast(`Status updated to ${newStatus.replace('_', ' ')}`);
      // Update local state optimistically or re-fetch
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  const handleDeletePrompt = (task) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await taskService.deleteTask(deletingTask._id);
      showToast('Task deleted successfully');
      setDeletingTask(null);
      fetchTasks();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(search || status || priority || sortBy !== 'createdAt' || sortOrder !== 'desc');

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Tasks Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Real-time metrics, prioritization, and ownership-isolated task tracking
        </p>
      </div>

      {/* Dashboard Stats */}
      <DashboardSummary stats={stats} loading={statsLoading} />

      {/* Filter & Action Toolbar */}
      <TaskFilters
        search={search}
        status={status}
        priority={priority}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        onStatusChange={(val) => { setStatus(val); setPage(1); }}
        onPriorityChange={(val) => { setPriority(val); setPage(1); }}
        onSortByChange={(val) => setSortBy(val)}
        onSortOrderChange={(val) => setSortOrder(val)}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        onOpenCreate={handleOpenCreateModal}
      />

      {/* Tasks Grid & Pagination */}
      <TaskList
        tasks={tasks}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onStatusChange={handleStatusChange}
        onEdit={handleOpenEditModal}
        onDelete={handleDeletePrompt}
        hasActiveFilters={hasActiveFilters}
        onOpenCreate={handleOpenCreateModal}
      />

      {/* Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${deletingTask?.title}"? This action cannot be reverted.`}
        confirmText="Yes, Delete Task"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`} id="dashboard-toast">
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
