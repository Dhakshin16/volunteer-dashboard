import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { firebaseUser, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return <div className="h-screen grid place-items-center"><div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" /></div>;
  }
  if (!firebaseUser) return <Navigate to="/auth" replace state={{ from: loc }} />;
  if (!profile?.role) return <Navigate to="/role" replace />;
  if (roles && !roles.includes(profile.role)) {
    if (profile.role === 'volunteer') return <Navigate to="/v" replace />;
    if (profile.role === 'ngo') return <Navigate to="/ngo" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  }
  return children || <Outlet />;
}
