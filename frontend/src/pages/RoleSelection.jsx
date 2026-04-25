import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import AuroraBackground from '@/components/AuroraBackground';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Heart, Building2, ArrowRight, Sparkles } from 'lucide-react';

const ROLES = [
  { id: 'volunteer', icon: Heart, color: 'from-violet-500 via-fuchsia-500 to-pink-500', title: 'I\'m a Volunteer', desc: 'Discover causes, get AI-matched, log hours and grow your impact.', perks: ['AI matching', 'Field reports', 'Impact rewards'] },
  { id: 'ngo', icon: Building2, color: 'from-cyan-400 via-sky-500 to-violet-500', title: 'I run an NGO', desc: 'Post causes, attract right-fit volunteers and coordinate resources.', perks: ['Cause posting', 'Volunteer console', 'Donation tracking'] },
];

export default function RoleSelection() {
  const [busy, setBusy] = useState(null);
  const { firebaseUser, refreshProfile, profile, loading } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (loading) return;
    if (!firebaseUser) nav('/auth');
    else if (profile?.role === 'volunteer') nav('/v');
    else if (profile?.role === 'ngo') nav('/ngo');
    else if (profile?.role === 'admin') nav('/admin');
  }, [firebaseUser, profile, loading, nav]);

  const choose = async (role) => {
    setBusy(role);
    try {
      await api.post('/user/role', { role });
      const p = await refreshProfile();
      toast.success('Role set!');
      if (role === 'volunteer') nav('/v/profile');
      else if (role === 'ngo') nav('/ngo/register');
    } catch (e) {
      toast.error(e.friendly || 'Could not set role');
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen relative grid place-items-center p-6">
      <AuroraBackground />
      <div className="max-w-5xl w-full text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs uppercase tracking-widest text-white/70">
          <Sparkles size={12} /> Choose your path
        </div>
        <h1 className="font-heading text-4xl sm:text-6xl text-white mt-6 leading-tight">
          How will you <span className="text-gradient">make impact</span>?
        </h1>
        <p className="text-white/65 mt-3 max-w-xl mx-auto">Pick a role to personalise your VolunCore experience. You can switch later from settings.</p>
        <div className="grid sm:grid-cols-2 gap-6 mt-10">
          {ROLES.map(({ id, icon: Icon, color, title, desc, perks }) => (
            <Card key={id} className="text-left hover:-translate-y-1 hover:bg-white/[0.07] transition-all relative overflow-hidden cursor-pointer group" onClick={() => !busy && choose(id)} data-testid={`role-${id}-card`}>
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${color} grid place-items-center text-white shadow-lg`}>
                <Icon size={26} />
              </div>
              <h3 className="font-heading text-2xl text-white mt-5">{title}</h3>
              <p className="text-white/65 text-sm mt-2">{desc}</p>
              <ul className="mt-5 space-y-1.5">
                {perks.map((p) => <li key={p} className="text-sm text-white/70 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />{p}</li>)}
              </ul>
              <Button className="mt-6 w-full" disabled={busy === id} data-testid={`role-${id}-btn`}>{busy === id ? 'Setting up…' : 'Continue'} <ArrowRight size={16} /></Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
