import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="empty-state" style={{ maxWidth: '600px', margin: '4rem auto' }}>
        <div className="empty-state-icon" style={{ color: '#ef4444' }}>🚫</div>
        <h1 className="empty-state-title" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          403 — Access Denied
        </h1>
        <p className="empty-state-desc">
          Administrative privileges are strictly required to view or manage user accounts.
          Your current account does not have sufficient permissions.
        </p>
        <Link to="/dashboard" className="btn btn-primary" id="btn-return-dashboard">
          Return to Tasks Dashboard
        </Link>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
