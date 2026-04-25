import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, Button, Badge, ProgressBar, Skeleton, Input, Select, Textarea, Avatar } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { fmtRelative } from '@/lib/utils';
import { ArrowLeft, MapPinned, Users, Heart, Calendar, Gift, FileText, Sparkles, Send, AlertTriangle } from 'lucide-react';

export default function CauseDetail({ role }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [cause, setCause] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [volunteers, setVolunteers] = useState([]);
  const [reports, setReports] = useState([]);
  const [donations, setDonations] = useState([]);
  const [events, setEvents] = useState([]);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [donation, setDonation] = useState({ type: 'money', amount: 100, currency: 'INR', item: '', quantity: 1, unit: 'pcs', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [c, v, r, d, e] = await Promise.allSettled([
        api.get(`/causes/${id}`),
        api.get(`/causes/${id}/volunteers`),
        api.get(`/causes/${id}/reports`),
        api.get(`/causes/${id}/donations`),
        api.get(`/causes/${id}/events`),
      ]);
      if (c.status === 'fulfilled') setCause(c.value.data);
      if (v.status === 'fulfilled') setVolunteers(v.value.data || []);
      if (r.status === 'fulfilled') setReports(r.value.data || []);
      if (d.status === 'fulfilled') setDonations(d.value.data || []);
      if (e.status === 'fulfilled') setEvents(e.value.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const enroll = async () => {
    try {
      await api.post('/enrollments/', { cause_id: id, motivation });
      toast.success('Enrolled! +20 impact points');
      setEnrollOpen(false); setMotivation('');
      load();
    } catch (e) { toast.error(e.friendly); }
  };

  const submitDonation = async () => {
    try {
      const payload = { cause_id: id, ...donation,
        amount: donation.type === 'money' ? Number(donation.amount) : null,
        quantity: donation.type === 'in-kind' ? Number(donation.quantity) : null,
      };
      await api.post('/donations/', payload);
      toast.success('Thank you for your contribution!');
      setDonateOpen(false);
      load();
    } catch (e) { toast.error(e.friendly); }
  };

  if (loading || !cause) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64" /><Skeleton className="h-32" /></div>;
  }

  const TabButton = ({ id: tid, children, count }) => (
    <button onClick={()=>setTab(tid)} className={`px-4 py-2 rounded-xl text-sm transition-all ${tab === tid ? 'bg-violet-500/30 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
      {children}{typeof count === 'number' && <span className="ml-1.5 text-xs text-white/50">({count})</span>}
    </button>
  );

  return (
    <div className="space-y-6">
      <button onClick={()=>nav(-1)} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><ArrowLeft size={14} /> Back</button>

      <Card className="glass-strong relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl bg-violet-500/30" />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <Badge variant="cyan">{cause.category}</Badge>
            <Badge variant={cause.urgency === 'critical' || cause.urgency === 'high' ? 'rose' : 'amber'}>{cause.urgency}</Badge>
            <Badge>by {cause.ngo_name || '—'}</Badge>
            <Badge variant="emerald">{cause.status}</Badge>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl text-white mt-4">{cause.title}</h1>
          {cause.ai_summary && (
            <div className="glass rounded-xl p-3 mt-4 text-white/80 italic"><Sparkles size={14} className="inline mr-1.5 text-violet-300" />{cause.ai_summary}</div>
          )}
          <p className="text-white/75 mt-4 leading-relaxed whitespace-pre-wrap">{cause.description}</p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-white/50 uppercase tracking-widest">Volunteers</div>
              <div className="font-heading text-2xl text-white mt-1">{cause.volunteers_joined || 0}/{cause.volunteers_needed}</div>
              <ProgressBar className="mt-2" value={cause.volunteers_joined || 0} max={cause.volunteers_needed || 1} />
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1"><MapPinned size={12} /> Location</div>
              <div className="text-white mt-1">{cause.location_city}, {cause.location_country}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-white/50 uppercase tracking-widest">Posted</div>
              <div className="text-white mt-1">{fmtRelative(cause.created_at)}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {(cause.skills_needed || []).map(s => <Badge key={s} variant="violet">{s}</Badge>)}
          </div>
          {role === 'volunteer' && cause.status === 'open' && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={()=>setEnrollOpen(true)}><Heart size={16} /> Join cause</Button>
              <Button variant="secondary" onClick={()=>setDonateOpen(true)}><Gift size={16} /> Contribute</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="glass rounded-2xl p-2 flex flex-wrap gap-1">
        <TabButton id="overview">Overview</TabButton>
        <TabButton id="volunteers" count={volunteers.length}>Volunteers</TabButton>
        <TabButton id="reports" count={reports.length}>Field reports</TabButton>
        <TabButton id="donations" count={donations.length}>Donations</TabButton>
        <TabButton id="events" count={events.length}>Events</TabButton>
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-heading text-xl text-white mb-3">Resources needed</h3>
            {(cause.resource_needs || []).length === 0 ? (
              <div className="text-white/50 text-sm">No specific resource needs listed.</div>
            ) : (
              <ul className="space-y-2">
                {cause.resource_needs.map((r, i) => (
                  <li key={i} className="glass rounded-lg p-3 flex justify-between">
                    <span className="text-white">{r.item}</span>
                    <span className="text-white/60">{r.quantity} {r.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-heading text-xl text-white mb-3">Resources received</h3>
            {(cause.resources_received || []).length === 0 ? (
              <div className="text-white/50 text-sm">No contributions yet — be the first!</div>
            ) : (
              <ul className="space-y-2">
                {cause.resources_received.slice(-8).reverse().map((r, i) => (
                  <li key={i} className="glass rounded-lg p-3 flex justify-between text-sm">
                    <span className="text-white">{r.amount ? `₹${r.amount.toLocaleString()}` : `${r.quantity} ${r.unit} · ${r.item}`}</span>
                    <span className="text-white/50">by {r.donor_name || 'Anon'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'volunteers' && (
        <Card>
          {volunteers.length === 0 ? <div className="text-white/50 py-8 text-center">No volunteers yet</div> : (
            <div className="divide-y divide-white/5">
              {volunteers.map(e => (
                <div key={e.id} className="flex items-center gap-4 py-3">
                  <Avatar name={e.volunteer?.full_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white">{e.volunteer?.full_name || 'Volunteer'}</div>
                    <div className="text-xs text-white/50">{e.volunteer?.city || '—'} · {e.hours_logged}h logged</div>
                  </div>
                  <Badge>{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? <Card className="text-center py-10 text-white/50">No reports yet</Card> : reports.map(r => {
            const a = r.ai_analysis || {};
            return (
              <Card key={r.id} className="relative">
                {r.is_crisis && <div className="absolute top-0 inset-x-0 h-1 bg-rose-500 animate-pulse" />}
                <div className="flex justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={a.urgency === 'critical' || a.urgency === 'high' ? 'rose' : 'amber'}>{a.urgency}</Badge>
                    {r.is_crisis && <Badge variant="rose"><AlertTriangle size={10} /> Crisis</Badge>}
                  </div>
                  <span className="text-xs text-white/50">{fmtRelative(r.created_at)}</span>
                </div>
                <p className="text-white/85 mt-2">{r.text}</p>
                {a.summary && <div className="text-xs text-white/60 italic mt-2"><Sparkles size={10} className="inline" /> {a.summary}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'donations' && (
        <Card>
          {donations.length === 0 ? <div className="text-center py-10 text-white/50">No donations yet</div> : (
            <div className="divide-y divide-white/5">
              {donations.map(d => (
                <div key={d.id} className="flex justify-between py-3">
                  <div>
                    <div className="text-white">{d.user_name || 'Anon'}</div>
                    <div className="text-xs text-white/50">{fmtRelative(d.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white">{d.type === 'money' ? `₹${(d.amount||0).toLocaleString()}` : `${d.quantity} ${d.unit} ${d.item}`}</div>
                    <Badge variant={d.type === 'money' ? 'emerald' : 'cyan'}>{d.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'events' && (
        <Card>
          {events.length === 0 ? <div className="text-center py-10 text-white/50">No events scheduled</div> : (
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="glass rounded-xl p-4">
                  <div className="flex justify-between"><div className="font-medium text-white">{ev.title}</div><Badge>{(ev.rsvps || []).length} RSVPs</Badge></div>
                  <div className="text-sm text-white/60 mt-1">{ev.description}</div>
                  <div className="text-xs text-white/50 mt-2 flex items-center gap-2"><Calendar size={12} /> {new Date(ev.starts_at).toLocaleString()} • {ev.location}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Dialog open={enrollOpen} onClose={()=>setEnrollOpen(false)} title="Join this cause">
        <Textarea rows={3} placeholder="Why are you joining? (optional)" value={motivation} onChange={e=>setMotivation(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={()=>setEnrollOpen(false)}>Cancel</Button>
          <Button onClick={enroll}><Heart size={14} /> Join</Button>
        </div>
      </Dialog>

      <Dialog open={donateOpen} onClose={()=>setDonateOpen(false)} title="Contribute">
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={()=>setDonation(d=>({ ...d, type: 'money' }))} className={`flex-1 py-3 rounded-xl border transition ${donation.type === 'money' ? 'bg-emerald-500/20 border-emerald-400/40 text-white' : 'glass border-white/10 text-white/60'}`}>₹ Money</button>
            <button onClick={()=>setDonation(d=>({ ...d, type: 'in-kind' }))} className={`flex-1 py-3 rounded-xl border transition ${donation.type === 'in-kind' ? 'bg-cyan-500/20 border-cyan-400/40 text-white' : 'glass border-white/10 text-white/60'}`}>📦 In-kind</button>
          </div>
          {donation.type === 'money' ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Input type="number" placeholder="Amount" value={donation.amount} onChange={e=>setDonation(d=>({ ...d, amount: e.target.value }))} /></div>
              <Select value={donation.currency} onChange={e=>setDonation(d=>({ ...d, currency: e.target.value }))}>
                <option className="bg-[#0b0f1e]">INR</option><option className="bg-[#0b0f1e]">USD</option><option className="bg-[#0b0f1e]">EUR</option>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Input className="col-span-2" placeholder="Item (e.g. blankets)" value={donation.item} onChange={e=>setDonation(d=>({ ...d, item: e.target.value }))} />
              <Input type="number" placeholder="Qty" value={donation.quantity} onChange={e=>setDonation(d=>({ ...d, quantity: e.target.value }))} />
            </div>
          )}
          <Input placeholder="Note (optional)" value={donation.note} onChange={e=>setDonation(d=>({ ...d, note: e.target.value }))} />
          <div className="text-xs text-white/50">This is a pledge — the NGO will contact you for collection. (No payment processed.)</div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setDonateOpen(false)}>Cancel</Button>
            <Button onClick={submitDonation}><Send size={14} /> Pledge</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
