import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, ProgressBar, Skeleton, Input } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Heart, Clock, MapPinned, FileText, ArrowRight, Plus, X } from 'lucide-react';

export default function VolunteerCauses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoursOpen, setHoursOpen] = useState(null);
  const [hours, setHours] = useState(1);
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/enrollments/me');
      setItems(data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submitHours = async () => {
    if (!hoursOpen) return;
    try {
      await api.post('/enrollments/hours', { enrollment_id: hoursOpen.id, hours: Number(hours), note });
      toast.success(`Logged ${hours}h • +${hours * 5} pts`);
      setHoursOpen(null); setNote(''); setHours(1);
      load();
    } catch (e) { toast.error(e.friendly); }
  };

  const withdraw = async (id) => {
    if (!confirm('Withdraw from this cause?')) return;
    try { await api.post(`/enrollments/${id}/withdraw`); toast.success('Withdrawn'); load(); }
    catch (e) { toast.error(e.friendly); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl text-white">My <span className="text-gradient">causes</span></h1>
        <p className="text-white/60 mt-2">Track hours, share field reports, and grow your impact.</p>
      </div>
      {loading ? (
        <div className="space-y-4">{[1,2].map(i=><Skeleton key={i} className="h-40" />)}</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <Heart className="mx-auto text-white/30" size={32} />
          <div className="text-white/60 mt-3">You haven't joined any cause yet.</div>
          <Link to="/v/discover"><Button className="mt-4">Discover causes</Button></Link>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {items.map(e => (
            <Card key={e.id} className="flex flex-col">
              <div className="flex justify-between">
                <Badge variant={e.status === 'active' ? 'emerald' : e.status === 'withdrawn' ? 'rose' : 'amber'}>{e.status}</Badge>
                <Badge variant="cyan">{e.cause?.category}</Badge>
              </div>
              <Link to={`/v/causes/${e.cause_id}`} className="block mt-3">
                <h3 className="font-heading text-xl text-white hover:text-gradient">{e.cause?.title}</h3>
              </Link>
              <div className="flex flex-wrap gap-3 text-xs text-white/50 mt-2">
                <span className="flex items-center gap-1"><MapPinned size={12} /> {e.cause?.location_city}</span>
                <span>Joined {fmtRelative(e.created_at)}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/70 mb-1"><span><Clock size={12} className="inline" /> {e.hours_logged}h logged</span></div>
                <ProgressBar value={e.hours_logged} max={Math.max(20, e.hours_logged + 5)} />
              </div>
              {e.motivation && <div className="mt-3 glass rounded-lg p-3 text-xs text-white/60 italic">“{e.motivation}”</div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={()=>{ setHoursOpen(e); setHours(1); setNote(''); }} disabled={e.status !== 'active'}>
                  <Plus size={14} /> Log hours
                </Button>
                <Link to="/v/reports"><Button size="sm" variant="secondary"><FileText size={14} /> Add report</Button></Link>
                {e.status === 'active' && <Button size="sm" variant="ghost" onClick={()=>withdraw(e.id)}><X size={14} /> Withdraw</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!hoursOpen} onClose={()=>setHoursOpen(null)} title="Log volunteer hours">
        <div className="space-y-4">
          <div className="text-sm text-white/60">Cause: <span className="text-white">{hoursOpen?.cause?.title}</span></div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60">Hours</label>
            <Input type="number" min="1" max="24" value={hours} onChange={e=>setHours(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60">Note (optional)</label>
            <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you do?" className="mt-1" />
          </div>
          <div className="text-xs text-violet-300">+{hours * 5} impact points</div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setHoursOpen(null)}>Cancel</Button>
            <Button onClick={submitHours}>Log</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
