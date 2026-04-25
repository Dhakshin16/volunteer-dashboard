import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Button } from '@/components/ui/primitives';
import AuroraBackground from '@/components/AuroraBackground';
import NotificationBell from '@/components/NotificationBell';
import { LayoutDashboard, Compass, Sparkles, MessageCircle, FileText, Heart, BarChart3, Users, ShieldCheck, Building2, LogOut, Trophy, Calendar, User, Menu, X, Award } from 'lucide-react';

function NavItem({ to, icon: Icon, children, end, testId }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testId}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
          isActive
            ? 'bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-cyan-500/20 text-white border border-violet-400/30 glow-violet'
            : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      <span>{children}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { profile, firebaseUser, logout } = useAuth();
  const role = profile?.role;
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const VolunteerNav = (
    <>
      <NavItem to="/v" icon={LayoutDashboard} end testId="nav-v-dashboard">Dashboard</NavItem>
      <NavItem to="/v/discover" icon={Compass} testId="nav-v-discover">Discover</NavItem>
      <NavItem to="/v/matches" icon={Sparkles} testId="nav-v-matches">AI Matches</NavItem>
      <NavItem to="/v/causes" icon={Heart} testId="nav-v-causes">My Causes</NavItem>
      <NavItem to="/v/reports" icon={FileText} testId="nav-v-reports">Field Reports</NavItem>
      <NavItem to="/v/chat" icon={MessageCircle} testId="nav-v-chat">Auri AI</NavItem>
      <NavItem to="/v/impact" icon={BarChart3} testId="nav-v-impact">Impact</NavItem>
      <NavItem to="/v/leaderboard" icon={Trophy} testId="nav-v-leaderboard">Leaderboard</NavItem>
      <NavItem to="/v/profile" icon={User} testId="nav-v-profile">Profile</NavItem>
    </>
  );

  const NgoNav = (
    <>
      <NavItem to="/ngo" icon={LayoutDashboard} end testId="nav-ngo-dashboard">Dashboard</NavItem>
      <NavItem to="/ngo/causes" icon={Heart} testId="nav-ngo-causes">My Causes</NavItem>
      <NavItem to="/ngo/causes/new" icon={Sparkles} testId="nav-ngo-new-cause">New Cause</NavItem>
      <NavItem to="/ngo/volunteers" icon={Users} testId="nav-ngo-volunteers">Volunteers</NavItem>
      <NavItem to="/ngo/events" icon={Calendar} testId="nav-ngo-events">Events</NavItem>
      <NavItem to="/ngo/profile" icon={Building2} testId="nav-ngo-profile">Org Profile</NavItem>
    </>
  );

  const AdminNav = (
    <>
      <NavItem to="/admin" icon={LayoutDashboard} end testId="nav-admin-overview">Overview</NavItem>
      <NavItem to="/admin/ngos" icon={Building2} testId="nav-admin-ngos">NGOs</NavItem>
      <NavItem to="/admin/crisis" icon={ShieldCheck} testId="nav-admin-crisis">Crisis Alerts</NavItem>
      <NavItem to="/admin/causes" icon={Heart} testId="nav-admin-causes">All Causes</NavItem>
      <NavItem to="/admin/leaderboard" icon={Award} testId="nav-admin-leaderboard">Leaderboard</NavItem>
    </>
  );

  const navItems = role === 'volunteer' ? VolunteerNav : role === 'ngo' ? NgoNav : role === 'admin' ? AdminNav : null;

  const onLogout = async () => { await logout(); nav('/'); };

  return (
    <div className="min-h-screen flex relative">
      <AuroraBackground />

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-64 p-4 border-r border-white/10 sticky top-0 h-screen glass-faint">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 px-1 py-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white font-bold shadow-lg shadow-violet-500/40">V</div>
            <div>
              <div className="font-heading font-semibold text-white text-lg leading-none">VolunCore</div>
              <div className="text-[10px] tracking-widest uppercase text-white/40">smart impact</div>
            </div>
          </Link>
          <NotificationBell />
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">{navItems}</nav>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar src={firebaseUser?.photoURL} name={profile?.name} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile?.name}</div>
              <div className="text-xs text-white/40 truncate capitalize">{role}</div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start mt-2" onClick={onLogout} data-testid="sidebar-signout">
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white font-bold">V</div>
          <span className="font-heading font-semibold text-white">VolunCore</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="menu"><Menu size={20} /></Button>
        </div>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="relative ml-auto h-full w-72 glass-strong p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white font-bold">V</div>
                <span className="font-heading font-semibold text-white">VolunCore</span>
              </Link>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X size={20} /></Button>
            </div>
            <nav className="flex flex-col gap-1.5 flex-1" onClick={() => setOpen(false)}>{navItems}</nav>
            <Button variant="ghost" className="w-full justify-start mt-4" onClick={onLogout}><LogOut size={16} /> Sign out</Button>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 page-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
