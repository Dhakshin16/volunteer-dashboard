import React, { useEffect, useState } from 'react';
import { Card, Avatar, Badge, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Users, MapPinned } from 'lucide-react';

export default function NgoVolunteers() {
  const [causes, setCauses] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const { data: cs } = await api.get('/ngo/me/causes');
      setCauses(cs || []);
      const allEnrolls = {};
      await Promise.all((cs || []).map(async c => {
        const { data: en } = await api.get(`/causes/${c.id}/volunteers`);
        allEnrolls[c.id] = en || [];
      }));
      setData(allEnrolls);
    } finally { setLoading(false); }
  })(); }, []);

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl text-white">Your <span className="text-gradient">volunteers</span></h1>
        <p className="text-white/60 mt-2">All volunteers across your causes.</p>
      </div>
      {causes.length === 0 && <Card className="text-center py-12 text-white/50"><Users className="mx-auto mb-3" size={28} />No causes yet — create one first.</Card>}
      {causes.map(c => (
        <Card key={c.id}>
          <h3 className="font-heading text-xl text-white mb-2">{c.title}</h3>
          <Badge variant="cyan" className="mb-3">{(data[c.id] || []).length} volunteers</Badge>
          {(data[c.id] || []).length === 0 ? <div className="text-white/50 text-sm py-3">No volunteers yet</div> : (
            <div className="divide-y divide-white/5">
              {(data[c.id] || []).map(e => (
                <div key={e.id} className="flex items-center gap-4 py-3">
                  <Avatar name={e.volunteer?.full_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white">{e.volunteer?.full_name || 'Volunteer'}</div>
                    <div className="text-xs text-white/50 flex gap-2"><span className="flex items-center gap-1"><MapPinned size={10} /> {e.volunteer?.city || '—'}</span><span>{(e.volunteer?.skills || []).slice(0, 3).join(', ')}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{e.hours_logged}h</div>
                    <div className="text-xs text-white/50">{fmtRelative(e.created_at)}</div>
                  </div>
                  <Badge variant={e.status === 'active' ? 'emerald' : 'rose'}>{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
