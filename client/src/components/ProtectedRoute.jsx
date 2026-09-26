import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading, getRoleDashboard } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs">Verifying authorization token...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page, preserving intended route
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn(`[ProtectedRoute] Access denied for role '${user.role}' to route '${location.pathname}'. Redirecting to role dashboard.`);
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  return children;
}
