import React from 'react';

const DashboardSummary = ({ stats, loading }) => {
  const cards = [
    {
      id: 'stat-card-total',
      title: 'Total Tasks',
      value: stats?.total ?? 0,
      className: 'stat-total',
      icon: '📊',
    },
    {
      id: 'stat-card-in-progress',
      title: 'In Progress',
      value: stats?.inProgress ?? 0,
      className: 'stat-in-progress',
      icon: '⚡',
    },
    {
      id: 'stat-card-pending',
      title: 'Pending',
      value: stats?.pending ?? 0,
      className: 'stat-pending',
      icon: '⏳',
    },
    {
      id: 'stat-card-completed',
      title: 'Completed',
      value: stats?.completed ?? 0,
      className: 'stat-completed',
      icon: '✅',
    },
    {
      id: 'stat-card-overdue',
      title: 'Overdue',
      value: stats?.overdue ?? 0,
      className: 'stat-overdue',
      icon: '🚨',
    },
  ];

  return (
    <div className="stats-grid" id="dashboard-stats-grid">
      {cards.map((card) => (
        <div key={card.id} id={card.id} className={`stat-card ${card.className}`}>
          <div className="stat-info">
            <span className="stat-title">{card.title}</span>
            <span className="stat-value">{loading ? '...' : card.value}</span>
          </div>
          <div className="stat-icon" aria-hidden="true">
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary;
