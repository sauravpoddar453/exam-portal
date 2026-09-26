import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeFetchJson, getApiUrl } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current user session from token
  const loadUser = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { ok, data } = await safeFetchJson('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (ok && data?.success) {
        setUser(data.data);
      } else {
        // Token expired or invalid
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading user:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser(token);
  }, [loadUser, token]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!ok || !data?.success) {
        const err = new Error(data?.message || 'Login failed. Please check credentials.');
        if (data?.requiresVerification) {
          err.requiresVerification = true;
          err.email = data.email || email;
        }
        throw err;
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register handler (requires email OTP verification)
  const register = async (name, email, password, role) => {
    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || 'Registration failed.');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP handler
  const verifyOtp = async (email, otp) => {
    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || 'OTP verification failed.');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const resendOtp = async (email) => {
    setError(null);
    try {
      const { ok, data } = await safeFetchJson('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || 'Failed to resend OTP.');
      }

      return data;
    } catch (err) {
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch(getApiUrl('/api/auth/logout'));
    } catch (err) {
      console.warn('Logout request warning:', err.message);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const getRoleDashboard = (userRole) => {
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'student':
      default:
        return '/student';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        getRoleDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
