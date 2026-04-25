import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Skeleton, ProgressBar } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Heart, Users, Plus, Sparkles, ArrowRight, Building2, BarChart3, MapPinned, AlertTriangle, Calendar } from 'lucide-react';

export default function NgoDashboard() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [ngo, setNgo] = useState(null);
  const [stats, setStats] = useState(null);
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const ng = await api.get('/ngo/me');
      setNgo(ng.data);
      if (!ng.data) { nav('/ngo/register'); return; }
      if (!ng.data.is_approved) { nav('/ngo/pending'); return; }
      const [s, c] = await Promise.all([api.get('/ngo/me/stats'), api.get('/ngo/me/causes')]);
      setStats(s.data); setCauses(c.data || []);
    } finally { setLoading(false); }
  })(); /* eslint-disable-next-line */ }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-40" /></div>;
  if (!ngo) return null;

  return (
    <div className="space-y-6">
      <Card className="glass-strong relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl bg-cyan-500/30" />
        <div className="relative grid lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-widest text-white/50">NGO console</div>
            <h1 className="font-heading text-4xl text-white mt-1">{ngo.org_name}</h1>
            <p className="text-white/65 mt-2 max-w-2xl">{ngo.mission}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="emerald">Approved</Badge>
              <Badge><MapPinned size={10} /> {ngo.city}</Badge>
              {(ngo.focus_areas || []).slice(0, 4).map(f => <Badge key={f} variant="cyan">{f}</Badge>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/ngo/causes/new"><Button><Plus size={16} /> New cause</Button></Link>
            <Link to="/ngo/profile"><Button variant="secondary"><Building2 size={16} /> Edit profile</Button></Link>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-xs uppercase tracking-widest text-white/50">Causes</div><div className="font-heading text-3xl text-white mt-1">{stats?.causes_total || 0}</div><div className="text-xs text-emerald-300">{stats?.causes_open || 0} open</div></Card>
        <Card><div className="text-xs uppercase tracking-widest text-white/50">Volunteers</div><div className="font-heading text-3xl text-white mt-1">{stats?.volunteers || 0}</div><div className="text-xs text-white/50">unique</div></Card>
        <Card><div className="text-xs uppercase tracking-widest text-white/50">Hours</div><div className="font-heading text-3xl text-white mt-1">{stats?.hours || 0}</div></Card>
        <Card><div className="text-xs uppercase tracking-widest text-white/50">Donations ₹</div><div className="font-heading text-3xl text-gradient mt-1">{(stats?.donations_money || 0).toLocaleString()}</div><div className="text-xs text-white/50">{stats?.donations_count || 0} contributions</div></Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl text-white">Your causes</h2>
          <Link to="/ngo/causes"><Button variant="ghost" size="sm">All <ArrowRight size={14} /></Button></Link>
        </div>
        {causes.length === 0 ? (
          <div className="text-center py-10 text-white/50">
            <Heart className="mx-auto text-white/30 mb-3" size={28} />
            No causes yet. <Link to="/ngo/causes/new" className="text-cyan-300 hover:underline">Create one</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {causes.slice(0, 4).map(c => (
              <Link key={c.id} to={`/ngo/causes/${c.id}`} className="glass rounded-xl p-4 hover:bg-white/[0.06] block">
                <div className="flex justify-between mb-2"><Badge variant="cyan">{c.category}</Badge><Badge variant={c.urgency === 'critical' || c.urgency === 'high' ? 'rose' : 'amber'}>{c.urgency}</Badge></div>
                <div className="text-white font-medium">{c.title}</div>
                <div className="flex justify-between text-xs text-white/50 mt-2"><span>{c.volunteers_joined || 0}/{c.volunteers_needed} volunteers</span><span>{c.status}</span></div>
                <ProgressBar className="mt-2" value={c.volunteers_joined || 0} max={c.volunteers_needed || 1} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
