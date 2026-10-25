import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const containerRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount();
      if (res.data) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently ignore background polling errors to avoid disruption
      console.warn('Failed to poll unread notifications count:', err);
    }
  }, [user]);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 15 });
      setNotifications(res.data || []);
      // Also update unread count based on response
      if (res.meta) {
        fetchUnreadCount();
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUnreadCount]);

  // Initial load and periodic 30-second polling
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();

    const intervalId = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    }, 30000); // 30 seconds polling interval

    return () => clearInterval(intervalId);
  }, [user, isOpen, fetchUnreadCount, fetchNotifications]);

  // Trigger notification fetch on dropdown open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    setActionLoadingId(id);
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    setActionLoadingId(id);
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNavigateToTask = (notification) => {
    setIsOpen(false);
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    const taskId = notification.task?._id || notification.task;
    if (taskId) {
      navigate(`/dashboard?taskId=${taskId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        id="btn-notification-bell"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="bell-icon"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge" id="notification-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" id="notification-dropdown-panel" role="region" aria-label="Notifications Panel">
          <div className="notification-dropdown-header">
            <div className="notification-header-title">
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="badge badge-pending" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn-link"
                id="btn-mark-all-read"
                title="Mark all notifications as read"
                disabled={loading}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {loading && notifications.length === 0 ? (
              <div className="notification-loading-state" id="notification-loading">
                <div className="spinner-sm" />
                <span>Checking notifications...</span>
              </div>
            ) : error ? (
              <div className="notification-error-state" id="notification-error">
                <span>⚠️ {error}</span>
                <button onClick={fetchNotifications} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty-state" id="notification-empty">
                <span className="empty-bell-icon">🔔</span>
                <p className="empty-title">All caught up!</p>
                <p className="empty-subtitle">You have no new task reminders or alerts.</p>
              </div>
            ) : (
              <ul className="notification-list">
                {notifications.map((notif) => {
                  const isOverdue = notif.type === 'TASK_OVERDUE';
                  const taskTitle = notif.task?.title || (typeof notif.task === 'string' ? 'Related Task' : null);

                  return (
                    <li
                      key={notif._id}
                      id={`notification-item-${notif._id}`}
                      className={`notification-item ${!notif.isRead ? 'unread' : 'read'} ${isOverdue ? 'type-overdue' : 'type-due'}`}
                      onClick={() => handleNavigateToTask(notif)}
                    >
                      <div className="notification-content">
                        <div className="notification-top-row">
                          <span className={`badge ${isOverdue ? 'badge-priority-high' : 'badge-priority-medium'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                            {isOverdue ? '⚠️ Overdue' : '⏰ Due'}
                          </span>
                          <span className="notification-time">{formatTimestamp(notif.createdAt)}</span>
                        </div>

                        <h4 className="notification-title">{notif.title}</h4>
                        <p className="notification-message">{notif.message}</p>

                        {taskTitle && (
                          <div className="notification-task-ref">
                            <span>📋 {taskTitle}</span>
                          </div>
                        )}
                      </div>

                      <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif._id, e)}
                            className="btn-icon-action"
                            id={`btn-read-${notif._id}`}
                            title="Mark as read"
                            disabled={actionLoadingId === notif._id}
                            aria-label="Mark notification as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notif._id, e)}
                          className="btn-icon-action delete"
                          id={`btn-delete-notif-${notif._id}`}
                          title="Delete notification"
                          disabled={actionLoadingId === notif._id}
                          aria-label="Delete notification"
                        >
                          &times;
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
