import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const AppLayout = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-content">
          <Link to="/dashboard" className="nav-brand" id="nav-brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#6366f1" />
              <path d="M7 12.5L10.5 16L17 8.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>TaskFlow<span style={{ color: '#ec4899' }}>Pro</span></span>
          </Link>

          <nav>
            <ul className="nav-links">
              <li className="nav-item">
                <NavLink
                  to="/dashboard"
                  id="nav-link-dashboard"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/profile"
                  id="nav-link-profile"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  Profile
                </NavLink>
              </li>
              {/* Enforce UI hiding of admin tab for regular users */}
              {isAdmin && (
                <li className="nav-item">
                  <NavLink
                    to="/admin/users"
                    id="nav-link-admin"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    User Management
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          <div className="user-profile-widget">
            <NotificationBell />

            <div className="user-info">
              <span className="user-name" id="user-display-name">{user?.name}</span>
              <span
                id="user-display-role"
                className={`user-role-badge ${isAdmin ? 'role-admin' : 'role-user'}`}
              >
                {user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              id="btn-logout"
              title="Log out securely"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
