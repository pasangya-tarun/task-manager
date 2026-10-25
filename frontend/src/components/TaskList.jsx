import React from 'react';
import TaskCard from './TaskCard';

const TaskList = ({
  tasks,
  loading,
  pagination,
  onPageChange,
  onStatusChange,
  onEdit,
  onDelete,
  hasActiveFilters,
  onOpenCreate,
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your tasks...</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="empty-state" id="empty-tasks-state">
        <div className="empty-state-icon">📋</div>
        <h2 className="empty-state-title">
          {hasActiveFilters ? 'No tasks match your filters' : 'No tasks created yet'}
        </h2>
        <p className="empty-state-desc">
          {hasActiveFilters
            ? 'Try adjusting your search query, status, or priority filter to find what you are looking for.'
            : 'Get started by creating your first task to track your work, set deadlines, and manage priorities.'}
        </p>
        {!hasActiveFilters && (
          <button
            onClick={onOpenCreate}
            className="btn btn-primary"
            id="btn-empty-create-task"
          >
            + Create Your First Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="tasks-grid" id="tasks-cards-grid">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-wrapper" id="tasks-pagination-controls">
          <div className="pagination-info">
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total tasks)
          </div>
          <div className="pagination-actions">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="btn btn-secondary btn-sm"
              id="btn-pagination-prev"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="btn btn-secondary btn-sm"
              id="btn-pagination-next"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
