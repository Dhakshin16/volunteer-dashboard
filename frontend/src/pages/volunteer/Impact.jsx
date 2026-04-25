import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { Sparkles, Download, Share2, RefreshCcw, Trophy, Heart, Clock, FileText } from 'lucide-react';
import { toast } from '@/components/ui/dialog';

export default function VolunteerImpact() {
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/volunteer/impact-report?period=${period}`);
      setReport(data);
    } catch (e) { toast.error(e.friendly); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period]);

  const share = async () => {
    if (!report) return;
    const text = `${report.headline}\n\n${report.story}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My VolunCore Impact', text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Story copied to clipboard!');
    }
  };

  const m = report?.metrics || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Sparkles size={12} /> AI Impact Story</div>
          <h1 className="font-heading text-4xl text-white mt-1">Your <span className="text-gradient">{period === 'week' ? 'weekly' : 'monthly'}</span> impact</h1>
        </div>
        <div className="flex gap-2">
          <div className="glass rounded-xl p-1 flex">
            <button onClick={()=>setPeriod('week')} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${period === 'week' ? 'bg-violet-500/30 text-white' : 'text-white/60 hover:text-white'}`}>Week</button>
            <button onClick={()=>setPeriod('month')} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${period === 'month' ? 'bg-violet-500/30 text-white' : 'text-white/60 hover:text-white'}`}>Month</button>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /></Button>
        </div>
      </div>

      {loading || !report ? (
        <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-32" /></div>
      ) : (
        <>
          <Card className="glass-strong relative overflow-hidden aurora-border">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl bg-violet-500/30 animate-float" />
            <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full blur-3xl bg-cyan-500/20 animate-float-slow" />
            <div className="relative">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Badge variant="violet"><Sparkles size={12} /> AI-generated</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={share}><Share2 size={14} /> Share</Button>
                </div>
              </div>
              <h2 className="font-heading text-3xl sm:text-5xl text-gradient bg-gradient-anim font-semibold mt-4 leading-tight">{report.headline}</h2>
              <p className="text-white/80 mt-4 text-lg leading-relaxed max-w-3xl">{report.summary}</p>
            </div>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center"><Heart className="mx-auto text-pink-300" size={20} /><div className="font-heading text-3xl text-white mt-2">{m.causes || 0}</div><div className="text-xs uppercase tracking-widest text-white/50">Causes</div></Card>
            <Card className="text-center"><Clock className="mx-auto text-amber-300" size={20} /><div className="font-heading text-3xl text-white mt-2">{m.hours || 0}</div><div className="text-xs uppercase tracking-widest text-white/50">Hours</div></Card>
            <Card className="text-center"><FileText className="mx-auto text-cyan-300" size={20} /><div className="font-heading text-3xl text-white mt-2">{m.reports || 0}</div><div className="text-xs uppercase tracking-widest text-white/50">Reports</div></Card>
            <Card className="text-center"><Trophy className="mx-auto text-violet-300" size={20} /><div className="font-heading text-3xl text-white mt-2">{m.donations || 0}</div><div className="text-xs uppercase tracking-widest text-white/50">Donations</div></Card>
          </div>

          {/* Highlights */}
          {(report.highlights || []).length > 0 && (
            <Card>
              <h3 className="font-heading text-xl text-white mb-4">Highlights</h3>
              <ul className="space-y-2">
                {report.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 text-white/80">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-violet-500/20 text-violet-200 grid place-items-center text-xs font-semibold">{i+1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Story */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><Sparkles className="text-violet-300" size={18} /><h3 className="font-heading text-xl text-white">Your impact story</h3></div>
            <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{report.story}</p>
          </Card>
        </>
      )}
    </div>
  );
}
