import React, { useEffect, useState } from 'react';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { AlertTriangle, MapPinned, Sparkles } from 'lucide-react';

export default function AdminCrisis() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { data } = await api.get('/admin/reports/crisis'); setItems(data || []); }
    finally { setLoading(false); }
  })(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2 text-rose-300"><AlertTriangle size={12} /> Live alerts</div>
        <h1 className="font-heading text-4xl text-white mt-1">Crisis <span className="text-gradient">monitor</span></h1>
        <p className="text-white/60 mt-2">AI-flagged emergencies needing immediate coordination.</p>
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-32" />)}</div> : items.length === 0 ? (
        <Card className="text-center py-16 text-white/50"><AlertTriangle className="mx-auto mb-3" size={32} />No crisis reports right now — stay vigilant.</Card>
      ) : (
        <div className="space-y-3">
          {items.map(r => {
            const a = r.ai_analysis || {};
            return (
              <Card key={r.id} className="border-l-4 border-rose-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500 animate-pulse" />
                <div className="flex justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="rose"><AlertTriangle size={10} /> CRISIS</Badge>
                    <Badge variant="rose">{a.urgency}</Badge>
                    <Badge variant="cyan">{a.category}</Badge>
                  </div>
                  <span className="text-xs text-white/50">{fmtRelative(r.created_at)}</span>
                </div>
                <p className="text-white mt-3">{r.text}</p>
                {a.summary && <div className="glass rounded-lg p-3 mt-3 text-sm text-white/70 italic"><Sparkles size={12} className="inline mr-1 text-violet-300" />{a.summary}</div>}
                {(a.needs || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{a.needs.map(n => <Badge key={n} variant="violet">{n}</Badge>)}</div>}
                {a.action_recommendation && <div className="text-cyan-300 text-sm mt-2">→ {a.action_recommendation}</div>}
                {(r.location_lat && r.location_lng) && <div className="text-xs text-white/50 mt-2 flex items-center gap-1"><MapPinned size={12} /> {r.location_lat.toFixed(4)}, {r.location_lng.toFixed(4)}</div>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
