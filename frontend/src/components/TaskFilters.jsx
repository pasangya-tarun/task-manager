import React from 'react';

const TaskFilters = ({
  search,
  status,
  priority,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSortByChange,
  onSortOrderChange,
  onReset,
  hasActiveFilters,
  onOpenCreate,
}) => {
  return (
    <div className="toolbar-card" id="tasks-filter-toolbar">
      <div className="filters-wrapper">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <label htmlFor="task-search-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Search tasks by title
          </label>
          <input
            id="task-search-input"
            type="text"
            className="search-input"
            placeholder="Search tasks by title..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <label htmlFor="filter-status-select" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
          Filter by Status
        </label>
        <select
          id="filter-status-select"
          className="select-filter"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <label htmlFor="filter-priority-select" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
          Filter by Priority
        </label>
        <select
          id="filter-priority-select"
          className="select-filter"
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <label htmlFor="sort-field-select" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
          Sort by Field
        </label>
        <select
          id="sort-field-select"
          className="select-filter"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          <option value="createdAt">Date Created</option>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>

        <label htmlFor="sort-order-select" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
          Sort Order
        </label>
        <select
          id="sort-order-select"
          className="select-filter"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value)}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="btn btn-secondary btn-sm"
            id="btn-reset-filters"
          >
            Reset Filters
          </button>
        )}
      </div>

      <button
        onClick={onOpenCreate}
        className="btn btn-primary"
        id="btn-create-task-toolbar"
      >
        + New Task
      </button>
    </div>
  );
};

export default TaskFilters;
