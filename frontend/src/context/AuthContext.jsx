import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Revalidate session on initial app load via /api/auth/me (in-memory state)
  const checkAuth = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response && response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 unauthenticated is normal on cold load if not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.data.user);
      return response;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (data) => {
    setAuthError(null);
    try {
      const response = await authService.register(data);
      // Registration requires OTP email verification before session is issued
      return response;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const verifyEmail = async ({ email, otp }) => {
    setAuthError(null);
    try {
      const response = await authService.verifyEmail({ email, otp });
      return response;
    } catch (err) {
      setAuthError(err.message || 'Email verification failed');
      throw err;
    }
  };

  const resendOtp = async ({ email }) => {
    try {
      const response = await authService.resendOtp({ email });
      return response;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API failed or session already expired:', err);
    } finally {
      setUser(null);
    }
  };

  const updateUserInState = (updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : null));
  };

  const value = {
    user,
    loading,
    authError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    verifyEmail,
    resendOtp,
    logout,
    checkAuth,
    updateUserInState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
