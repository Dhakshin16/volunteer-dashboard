import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { Sparkles, MapPinned, ArrowRight, RefreshCcw } from 'lucide-react';

export default function VolunteerMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/volunteer/matches');
      setMatches(data || []);
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Sparkles size={12} /> Smart, personalised matches</div>
          <h1 className="font-heading text-4xl text-white mt-1">Your <span className="text-gradient">AI matches</span></h1>
          <p className="text-white/60 mt-2">Causes ranked by skill overlap, urgency, location, and your interests.</p>
        </div>
        <Button variant="secondary" onClick={()=>{ setRefreshing(true); load(); }} disabled={refreshing}>
          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /> Re-rank
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-32" />)}</div>
      ) : matches.length === 0 ? (
        <Card className="text-center py-16">
          <Sparkles className="mx-auto text-white/30" size={32} />
          <div className="text-white/60 mt-3">No matches yet. Make sure your profile has skills filled in.</div>
          <div className="flex gap-2 justify-center mt-4">
            <Link to="/v/profile"><Button>Edit profile</Button></Link>
            <Link to="/v/discover"><Button variant="secondary">Browse all causes</Button></Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m, i) => (
            <Link key={m.cause_id} to={`/v/causes/${m.cause_id}`} className="block">
              <Card className="hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute -left-20 -top-20 w-60 h-60 rounded-full blur-3xl bg-violet-500/30" />
                <div className="relative grid lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-2 text-center">
                    <div className="font-heading text-5xl text-gradient bg-gradient-anim font-semibold">{Math.round(m.score * 100)}<span className="text-2xl">%</span></div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">match #{i + 1}</div>
                  </div>
                  <div className="lg:col-span-8">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="cyan">{m.cause?.category}</Badge>
                      <Badge variant={m.cause?.urgency === 'critical' || m.cause?.urgency === 'high' ? 'rose' : 'amber'}>{m.cause?.urgency}</Badge>
                      {m.cause?.location_city && <Badge><MapPinned size={10} /> {m.cause.location_city}</Badge>}
                    </div>
                    <h3 className="font-heading text-2xl text-white">{m.cause?.title}</h3>
                    <p className="text-white/60 text-sm mt-2 line-clamp-2">{m.cause?.ai_summary || m.cause?.description}</p>
                    <div className="glass rounded-lg p-3 mt-3 text-sm text-white/70 italic">
                      <Sparkles size={14} className="inline mr-1.5 text-violet-300" />Why we matched: {m.reason}
                    </div>
                  </div>
                  <div className="lg:col-span-2 flex justify-end">
                    <Button variant="primary">View <ArrowRight size={14} /></Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
