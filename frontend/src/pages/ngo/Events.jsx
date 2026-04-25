import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Label, Select, Badge, Skeleton, Textarea } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Calendar, Plus, Users } from 'lucide-react';

export default function NgoEvents() {
  const [events, setEvents] = useState([]);
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cause_id: '', title: '', description: '', starts_at: '', ends_at: '', location: '', max_attendees: '' });

  const load = async () => {
    try {
      const [e, c] = await Promise.all([api.get('/events/me'), api.get('/ngo/me/causes')]);
      setEvents(e.data || []); setCauses(c.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const payload = { ...form, max_attendees: form.max_attendees ? Number(form.max_attendees) : null };
      await api.post('/events/', payload);
      toast.success('Event created');
      setOpen(false);
      setForm({ cause_id: '', title: '', description: '', starts_at: '', ends_at: '', location: '', max_attendees: '' });
      load();
    } catch (e) { toast.error(e.friendly); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-4xl text-white"><span className="text-gradient">Events</span></h1>
          <p className="text-white/60 mt-2">Schedule volunteer drives & coordination meetups.</p>
        </div>
        <Button onClick={()=>setOpen(true)} disabled={causes.length === 0}><Plus size={16} /> New event</Button>
      </div>
      {loading ? <Skeleton className="h-40" /> : events.length === 0 ? (
        <Card className="text-center py-12 text-white/50"><Calendar className="mx-auto mb-3" size={28} />No events yet</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map(ev => (
            <Card key={ev.id}>
              <h3 className="font-heading text-xl text-white">{ev.title}</h3>
              <p className="text-sm text-white/60 mt-1">{ev.description}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/50">
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ev.starts_at).toLocaleString()}</span>
                <span>{ev.location}</span>
                <Badge><Users size={10} /> {(ev.rsvps || []).length} RSVPs</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onClose={()=>setOpen(false)} title="New event" maxWidth="max-w-xl">
        <div className="space-y-3">
          <Select value={form.cause_id} onChange={e=>setForm(f=>({ ...f, cause_id: e.target.value }))} required>
            <option value="" className="bg-[#0b0f1e]">Select cause…</option>
            {causes.map(c => <option key={c.id} value={c.id} className="bg-[#0b0f1e]">{c.title}</option>)}
          </Select>
          <Input placeholder="Event title" value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} />
          <Textarea placeholder="Description" value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={e=>setForm(f=>({ ...f, starts_at: e.target.value }))} /></div>
            <div><Label>Ends at</Label><Input type="datetime-local" value={form.ends_at} onChange={e=>setForm(f=>({ ...f, ends_at: e.target.value }))} /></div>
          </div>
          <Input placeholder="Location" value={form.location} onChange={e=>setForm(f=>({ ...f, location: e.target.value }))} />
          <Input type="number" placeholder="Max attendees (optional)" value={form.max_attendees} onChange={e=>setForm(f=>({ ...f, max_attendees: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
