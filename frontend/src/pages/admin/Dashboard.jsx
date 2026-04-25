import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Users, Heart, Building2, AlertTriangle, BarChart3, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, sublabel }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-50 ${color}`} />
      <div className="relative">
        <div className="flex justify-between items-center">
          <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
          <Icon size={18} className="text-white/70" />
        </div>
        <div className="font-heading text-4xl text-white mt-2">{value}</div>
        {sublabel && <div className="text-xs text-white/40 mt-1">{sublabel}</div>}
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { data } = await api.get('/admin/overview'); setData(data); }
    finally { setLoading(false); }
  })(); }, []);

  if (loading || !data) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-40" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><ShieldCheck size={12} /> Admin console</div>
          <h1 className="font-heading text-4xl text-white mt-1">Platform <span className="text-gradient">overview</span></h1>
          <p className="text-white/60 mt-2">Real-time pulse on volunteers, NGOs, causes & crises.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Volunteers" value={data.volunteers} color="bg-violet-500/40" sublabel={`${data.users} total users`} />
        <StatCard icon={Building2} label="NGOs approved" value={data.ngos_approved} color="bg-cyan-500/40" sublabel={`${data.ngos_pending} pending`} />
        <StatCard icon={Heart} label="Causes open" value={data.causes_open} color="bg-pink-500/40" sublabel={`${data.causes_total} total`} />
        <StatCard icon={AlertTriangle} label="Crisis reports" value={data.crisis_count} color="bg-rose-500/40" sublabel={`${data.reports_total} total`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-heading text-2xl text-white flex items-center gap-2"><BarChart3 size={20} /> Causes by category</h2>
          </div>
          <div className="space-y-2">
            {(data.category_breakdown || []).map(b => {
              const pct = (b.count / Math.max(1, data.causes_total)) * 100;
              return (
                <div key={b.category}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-white capitalize">{b.category}</span><span className="text-white/60">{b.count}</span></div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" style={{ width: pct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3"><div className="text-xs text-white/50">Donations ₹</div><div className="font-heading text-2xl text-gradient">{(data.donations_money_total || 0).toLocaleString()}</div></div>
            <div className="glass rounded-xl p-3"><div className="text-xs text-white/50">In-kind drops</div><div className="font-heading text-2xl text-white">{data.donations_in_kind_count || 0}</div></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-white flex items-center gap-2"><AlertTriangle className="text-rose-300" size={18} /> Recent crises</h2>
            <Link to="/admin/crisis"><Button variant="ghost" size="sm">All <ArrowRight size={14} /></Button></Link>
          </div>
          {(data.recent_crisis || []).length === 0 ? (
            <div className="text-center py-8 text-white/50">No crises detected</div>
          ) : (
            <div className="space-y-3">
              {data.recent_crisis.map(r => (
                <div key={r.id} className="glass rounded-lg p-3 border-l-2 border-rose-400">
                  <div className="flex justify-between"><Badge variant="rose">{r.ai_analysis?.urgency}</Badge><span className="text-xs text-white/50">{fmtRelative(r.created_at)}</span></div>
                  <p className="text-sm text-white mt-2 line-clamp-2">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/admin/ngos"><Card className="hover:-translate-y-1 transition cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-cyan-500/20 grid place-items-center"><Building2 className="text-cyan-300" size={18} /></div><div><div className="font-medium text-white">NGO approvals</div><div className="text-xs text-white/50">{data.ngos_pending} pending</div></div></div></Card></Link>
        <Link to="/admin/causes"><Card className="hover:-translate-y-1 transition cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-pink-500/20 grid place-items-center"><Heart className="text-pink-300" size={18} /></div><div><div className="font-medium text-white">All causes</div><div className="text-xs text-white/50">Browse & moderate</div></div></div></Card></Link>
        <Link to="/admin/leaderboard"><Card className="hover:-translate-y-1 transition cursor-pointer"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-amber-500/20 grid place-items-center"><Sparkles className="text-amber-300" size={18} /></div><div><div className="font-medium text-white">Top volunteers</div><div className="text-xs text-white/50">Leaderboard</div></div></div></Card></Link>
      </div>
    </div>
  );
}
