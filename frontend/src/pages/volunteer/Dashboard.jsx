import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, ProgressBar, Skeleton, Avatar } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { fmtRelative } from '@/lib/utils';
import { Sparkles, Heart, FileText, Trophy, MapPinned, ArrowRight, Flame, Calendar, MessageCircle, Compass, BarChart3 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, hint }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-50 ${color}`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
          <Icon size={18} className="text-white/70" />
        </div>
        <div className="font-heading text-4xl text-white mt-2">{value}</div>
        {hint && <div className="text-xs text-white/40 mt-1">{hint}</div>}
      </div>
    </Card>
  );
}

export default function VolunteerDashboard() {
  const { profile } = useAuth();
  const [vp, setVp] = useState(null);
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, s, mm, en] = await Promise.allSettled([
          api.get('/volunteer/me'),
          api.get('/volunteer/stats'),
          api.get('/volunteer/matches'),
          api.get('/enrollments/me'),
        ]);
        if (m.status === 'fulfilled') setVp(m.value.data);
        if (s.status === 'fulfilled') setStats(s.value.data);
        if (mm.status === 'fulfilled') setMatches(mm.value.data || []);
        if (en.status === 'fulfilled') setEnrollments(en.value.data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const points = vp?.impact_points || 0;
  const nextTier = points < 100 ? 100 : points < 500 ? 500 : points < 1000 ? 1000 : points + 500;
  const tierName = points < 100 ? 'Rising Star' : points < 500 ? 'Impact Maker' : points < 1000 ? 'Community Hero' : 'Legend';

  if (!vp && !loading) {
    return (
      <Card className="text-center py-16">
        <Sparkles className="mx-auto text-violet-300" size={36} />
        <h2 className="font-heading text-3xl text-white mt-4">Welcome to VolunCore</h2>
        <p className="text-white/60 mt-2 max-w-md mx-auto">Complete your volunteer profile to unlock AI-matched causes tailored to your skills.</p>
        <Link to="/v/profile"><Button className="mt-6" data-testid="setup-profile-btn">Setup my profile <ArrowRight size={16} /></Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting hero */}
      <Card className="glass-strong relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full blur-3xl bg-violet-500/30" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 rounded-full blur-3xl bg-cyan-500/20" />
        <div className="relative grid lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-widest text-white/50">Welcome back</div>
            <h1 className="font-heading text-3xl sm:text-4xl text-white mt-1">Hey, {(vp?.full_name || profile?.name || 'friend').split(' ')[0]}<span className="text-gradient"> — ready to make impact?</span></h1>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="violet"><Trophy size={12} /> {tierName}</Badge>
              {(vp?.badges || []).slice(0, 3).map(b => <Badge key={b} variant="cyan">{b}</Badge>)}
              {vp?.city && <Badge><MapPinned size={12} /> {vp.city}</Badge>}
            </div>
            <div className="mt-5 max-w-md">
              <div className="flex justify-between text-xs text-white/60 mb-1.5"><span>{points} pts</span><span>Next: {nextTier}</span></div>
              <ProgressBar value={points} max={nextTier} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/v/discover"><Button><Compass size={16} /> Discover causes</Button></Link>
            <Link to="/v/chat"><Button variant="secondary"><MessageCircle size={16} /> Ask Auri</Button></Link>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Heart} label="Causes" value={vp?.causes_supported || 0} color="bg-pink-500/40" hint={`${stats?.recent_causes || 0} this week`} />
        <StatCard icon={Flame} label="Hours" value={vp?.hours_logged || 0} color="bg-amber-500/40" />
        <StatCard icon={FileText} label="Reports" value={stats?.reports || 0} color="bg-cyan-500/40" hint={`${stats?.recent_reports || 0} this week`} />
        <StatCard icon={Trophy} label="Impact pts" value={points} color="bg-violet-500/40" />
      </div>

      {/* Two-column */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI matches */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-2xl text-white flex items-center gap-2"><Sparkles className="text-violet-300" size={20} /> AI Matches for you</h2>
              <p className="text-sm text-white/50">Powered by Gemini — ranked by skill, urgency & proximity</p>
            </div>
            <Link to="/v/matches"><Button variant="ghost" size="sm">See all <ArrowRight size={14} /></Button></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-20" />)}</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 text-white/50">No matches yet. Try discovering causes →</div>
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 4).map(m => (
                <Link key={m.cause_id} to={`/v/causes/${m.cause_id}`} className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.07] transition-all block">
                  <div className="shrink-0 text-center">
                    <div className="font-heading text-2xl text-gradient">{Math.round(m.score * 100)}%</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">match</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium truncate">{m.cause?.title}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="cyan">{m.cause?.category}</Badge>
                      <Badge variant={m.cause?.urgency === 'critical' || m.cause?.urgency === 'high' ? 'rose' : 'amber'}>{m.cause?.urgency}</Badge>
                      {m.cause?.location_city && <Badge><MapPinned size={10} /> {m.cause.location_city}</Badge>}
                    </div>
                    <div className="text-xs text-white/50 mt-1.5 italic line-clamp-1">“{m.reason}”</div>
                  </div>
                  <ArrowRight className="text-white/40" size={18} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Active causes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-white flex items-center gap-2"><Heart className="text-pink-300" size={18} /> Your causes</h2>
            <Link to="/v/causes"><Button variant="ghost" size="sm">All <ArrowRight size={14} /></Button></Link>
          </div>
          {loading ? <Skeleton className="h-32" /> : enrollments.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-8">No enrollments yet</div>
          ) : (
            <div className="space-y-2.5">
              {enrollments.slice(0, 4).map(e => (
                <Link key={e.id} to={`/v/causes/${e.cause_id}`} className="glass rounded-lg p-3 block hover:bg-white/[0.06]">
                  <div className="text-sm text-white truncate">{e.cause?.title}</div>
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>{e.hours_logged}h logged</span>
                    <span>{fmtRelative(e.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom CTAs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/v/reports"><Card className="hover:-translate-y-1 transition-all cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-cyan-500/20 grid place-items-center"><FileText className="text-cyan-300" size={18} /></div><div><div className="font-medium text-white">Submit Field Report</div><div className="text-xs text-white/50">Photo + voice + AI</div></div></div></Card></Link>
        <Link to="/v/impact"><Card className="hover:-translate-y-1 transition-all cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-violet-500/20 grid place-items-center"><BarChart3 className="text-violet-300" size={18} /></div><div><div className="font-medium text-white">Weekly Impact</div><div className="text-xs text-white/50">AI-generated story</div></div></div></Card></Link>
        <Link to="/v/leaderboard"><Card className="hover:-translate-y-1 transition-all cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-amber-500/20 grid place-items-center"><Trophy className="text-amber-300" size={18} /></div><div><div className="font-medium text-white">Leaderboard</div><div className="text-xs text-white/50">Top changemakers</div></div></div></Card></Link>
      </div>
    </div>
  );
}
