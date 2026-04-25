import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import AuroraBackground from '@/components/AuroraBackground';

import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import RoleSelection from '@/pages/RoleSelection';
import CauseDetail from '@/pages/CauseDetail';

// Volunteer
import VolunteerDashboard from '@/pages/volunteer/Dashboard';
import VolunteerProfile from '@/pages/volunteer/Profile';
import VolunteerDiscover from '@/pages/volunteer/Discover';
import VolunteerMatches from '@/pages/volunteer/Matches';
import VolunteerCauses from '@/pages/volunteer/MyCauses';
import VolunteerReports from '@/pages/volunteer/Reports';
import VolunteerChat from '@/pages/volunteer/Chat';
import VolunteerImpact from '@/pages/volunteer/Impact';
import VolunteerLeaderboard from '@/pages/volunteer/Leaderboard';

// NGO
import NgoDashboard from '@/pages/ngo/Dashboard';
import NgoRegister from '@/pages/ngo/Register';
import NgoPending from '@/pages/ngo/Pending';
import NgoCauses from '@/pages/ngo/Causes';
import NgoCauseEditor from '@/pages/ngo/CauseEditor';
import NgoVolunteers from '@/pages/ngo/Volunteers';
import NgoEvents from '@/pages/ngo/Events';
import NgoProfile from '@/pages/ngo/Profile';

// Admin
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminNgos from '@/pages/admin/Ngos';
import AdminCrisis from '@/pages/admin/Crisis';
import AdminCauses from '@/pages/admin/Causes';
import AdminLeaderboard from '@/pages/admin/Leaderboard';

import NotificationPreferences from '@/pages/NotificationPreferences';

import '@/App.css';

function HomeRedirect() {
  const { firebaseUser, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen grid place-items-center">
        <AuroraBackground />
        <div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!firebaseUser) return <Landing />;
  if (!profile?.role) return <Navigate to="/role" replace />;
  if (profile.role === 'volunteer') return <Navigate to="/v" replace />;
  if (profile.role === 'ngo') return <Navigate to="/ngo" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  return <Landing />;
}

function NgoRoute() {
  // gating for NGO: must register → pending → dashboard
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/role" element={<RoleSelection />} />

          {/* Volunteer */}
          <Route element={<ProtectedRoute roles={['volunteer']}><Layout /></ProtectedRoute>}>
            <Route path="/v" element={<VolunteerDashboard />} />
            <Route path="/v/discover" element={<VolunteerDiscover />} />
            <Route path="/v/matches" element={<VolunteerMatches />} />
            <Route path="/v/causes" element={<VolunteerCauses />} />
            <Route path="/v/reports" element={<VolunteerReports />} />
            <Route path="/v/chat" element={<VolunteerChat />} />
            <Route path="/v/impact" element={<VolunteerImpact />} />
            <Route path="/v/leaderboard" element={<VolunteerLeaderboard />} />
            <Route path="/v/profile" element={<VolunteerProfile />} />
            <Route path="/v/notifications" element={<NotificationPreferences />} />
            <Route path="/v/causes/:id" element={<CauseDetail role="volunteer" />} />
          </Route>

          {/* NGO */}
          <Route path="/ngo/register" element={<ProtectedRoute roles={['ngo']}><NgoRegister /></ProtectedRoute>} />
          <Route path="/ngo/pending" element={<ProtectedRoute roles={['ngo']}><NgoPending /></ProtectedRoute>} />
          <Route element={<ProtectedRoute roles={['ngo']}><NgoRoute /></ProtectedRoute>}>
            <Route path="/ngo" element={<NgoDashboard />} />
            <Route path="/ngo/causes" element={<NgoCauses />} />
            <Route path="/ngo/causes/new" element={<NgoCauseEditor />} />
            <Route path="/ngo/causes/:id" element={<CauseDetail role="ngo" />} />
            <Route path="/ngo/volunteers" element={<NgoVolunteers />} />
            <Route path="/ngo/events" element={<NgoEvents />} />
            <Route path="/ngo/profile" element={<NgoProfile />} />
            <Route path="/ngo/notifications" element={<NotificationPreferences />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/ngos" element={<AdminNgos />} />
            <Route path="/admin/crisis" element={<AdminCrisis />} />
            <Route path="/admin/causes" element={<AdminCauses />} />
            <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
            <Route path="/admin/notifications" element={<NotificationPreferences />} />
            <Route path="/admin/causes/:id" element={<CauseDetail role="admin" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
