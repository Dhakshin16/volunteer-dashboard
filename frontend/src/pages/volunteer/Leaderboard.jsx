import React, { useEffect, useState } from 'react';
import { Card, Avatar, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { Trophy, Crown, Medal } from 'lucide-react';

export default function VolunteerLeaderboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { data } = await api.get('/volunteer/leaderboard'); setItems(data || []); }
    finally { setLoading(false); }
  })(); }, []);

  const TopRank = ({ p, place }) => {
    const colors = { 1: 'from-amber-400 to-amber-600', 2: 'from-slate-300 to-slate-500', 3: 'from-orange-400 to-orange-700' };
    const Icon = place === 1 ? Crown : Medal;
    return (
      <Card className="text-center relative overflow-hidden hover:-translate-y-1 transition-all">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors[place]}`} />
        <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${colors[place]} grid place-items-center mb-3 shadow-xl`}>
          <Icon className="text-white" size={28} />
        </div>
        <Avatar name={p.full_name} size={64} className="mx-auto" />
        <div className="font-heading text-lg text-white mt-3">{p.full_name}</div>
        <div className="text-xs text-white/50">{p.city}</div>
        <div className="font-heading text-3xl text-gradient mt-2">{p.impact_points || 0}</div>
        <div className="text-xs uppercase tracking-widest text-white/40">impact pts</div>
        <div className="flex flex-wrap gap-1 justify-center mt-3">
          {(p.badges || []).slice(0, 3).map(b => <Badge key={b} variant="violet">{b}</Badge>)}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Trophy size={12} /> Hall of Heroes</div>
        <h1 className="font-heading text-4xl text-white mt-1">Top <span className="text-gradient">changemakers</span></h1>
        <p className="text-white/60 mt-2">Recognising volunteers driving the most measurable impact.</p>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-64" />)}</div>
      ) : (
        <>
          {items.length >= 3 && (
            <div className="grid sm:grid-cols-3 gap-4">
              <TopRank p={items[1]} place={2} />
              <TopRank p={items[0]} place={1} />
              <TopRank p={items[2]} place={3} />
            </div>
          )}
          <Card>
            {items.slice(3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="font-heading text-2xl text-white/40 w-8 tabular-nums">{i + 4}</span>
                <Avatar name={p.full_name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">{p.full_name}</div>
                  <div className="text-xs text-white/40">{p.city || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-xl text-gradient">{p.impact_points || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">pts</div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-center py-12 text-white/50">No volunteers yet. Be the first hero!</div>}
          </Card>
        </>
      )}
    </div>
  );
}
