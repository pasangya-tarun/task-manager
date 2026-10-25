import React from 'react';

const TaskCard = ({ task, onStatusChange, onEdit, onDelete }) => {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  const formatDueDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCreatedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="task-card" id={`task-card-${task._id}`}>
      <div>
        <div className="task-card-header">
          <h3 className="task-card-title">{task.title}</h3>
        </div>

        <div className="task-badges">
          <span className={`badge badge-${task.status}`}>
            ● {task.status.replace('_', ' ')}
          </span>
          <span className={`badge badge-priority-${task.priority}`}>
            ▲ {task.priority} priority
          </span>
        </div>

        {task.description && (
          <p className="task-card-desc">{task.description}</p>
        )}
      </div>

      <div>
        <div className="task-meta">
          <span className={isOverdue ? 'meta-overdue' : ''}>
            📅 {formatDueDate(task.dueDate)} {isOverdue && '(Overdue)'}
          </span>
          <span>Created {formatCreatedDate(task.createdAt)}</span>
        </div>

        <div className="task-actions">
          <label htmlFor={`status-select-${task._id}`} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Change status for {task.title}
          </label>
          <select
            id={`status-select-${task._id}`}
            className="status-dropdown"
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <div className="action-buttons">
            <button
              onClick={() => onEdit(task)}
              className="btn btn-secondary btn-sm"
              id={`btn-edit-task-${task._id}`}
              title="Edit task details"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(task)}
              className="btn btn-danger btn-sm"
              id={`btn-delete-task-${task._id}`}
              title="Delete task"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
