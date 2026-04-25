import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Skeleton, Input, Select } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Building2, Check, X, MapPinned, Globe } from 'lucide-react';

export default function AdminNgos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') { const { data } = await api.get('/admin/ngos/pending'); setItems(data || []); }
      else { const { data } = await api.get(`/admin/ngos?approved_only=${filter === 'approved'}`); setItems(data || []); }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (id, approve, reason) => {
    try { await api.post(`/admin/ngos/${id}/approve`, { approve, reason }); toast.success(approve ? 'NGO approved' : 'NGO rejected'); load(); }
    catch (e) { toast.error(e.friendly); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-4xl text-white">NGO <span className="text-gradient">approvals</span></h1>
          <p className="text-white/60 mt-2">Review and approve organisations.</p>
        </div>
        <div className="glass rounded-xl p-1 flex">
          {[['pending','Pending'],['approved','Approved'],['all','All']].map(([k, l]) => (
            <button key={k} onClick={()=>setFilter(k)} data-testid={`admin-ngos-filter-${k}`} className={`px-4 py-1.5 rounded-lg text-sm transition ${filter === k ? 'bg-violet-500/30 text-white' : 'text-white/60 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-32" />)}</div> : items.length === 0 ? (
        <Card className="text-center py-12 text-white/50"><Building2 className="mx-auto mb-3" size={28} />No NGOs in this view</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(n => (
            <Card key={n.id} data-testid={`admin-ngo-card-${n.id}`}>
              <div className="flex justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-xl text-white">{n.org_name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(n.focus_areas || []).slice(0, 5).map(f => <Badge key={f} variant="cyan">{f}</Badge>)}
                  </div>
                </div>
                {n.is_approved ? <Badge variant="emerald">Approved</Badge> : n.rejection_reason ? <Badge variant="rose">Rejected</Badge> : <Badge variant="amber">Pending</Badge>}
              </div>
              <p className="text-sm text-white/70 mt-3">{n.mission}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/50">
                <span className="flex items-center gap-1"><MapPinned size={12} /> {n.city}, {n.country}</span>
                {n.website && <a href={n.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cyan-300"><Globe size={12} /> {n.website}</a>}
                <span>{n.contact_email}</span>
              </div>
              {!n.is_approved && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="success" onClick={()=>approve(n.id, true)} data-testid={`admin-ngo-approve-${n.id}`}><Check size={14} /> Approve</Button>
                  <Button size="sm" variant="danger" onClick={()=>{ setReject(n); setReason(n.rejection_reason || ''); }} data-testid={`admin-ngo-reject-${n.id}`}><X size={14} /> Reject</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reject} onClose={()=>setReject(null)} title="Reject NGO">
        <div className="space-y-3">
          <div className="text-sm text-white/60">Reason for {reject?.org_name}</div>
          <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain why…" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setReject(null)}>Cancel</Button>
            <Button variant="danger" onClick={()=>{ approve(reject.id, false, reason); setReject(null); }}>Reject</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
