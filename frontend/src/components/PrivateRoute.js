import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && !requiredRole.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default PrivateRoute;
