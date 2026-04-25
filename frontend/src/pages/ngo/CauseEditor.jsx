import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Label, Select, Badge } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Plus, X, Save, Sparkles } from 'lucide-react';

export default function NgoCauseEditor() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'education',
    location_city: '', location_country: '',
    skills_needed: [], volunteers_needed: 5, urgency: 'medium',
    start_date: '', end_date: '',
    cover_image_url: '', resource_needs: [],
  });
  const [skill, setSkill] = useState('');
  const [res, setRes] = useState({ item: '', quantity: 1, unit: 'pcs' });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addSkill = () => { const s = skill.trim().toLowerCase(); if (!s || form.skills_needed.includes(s)) return; upd('skills_needed', [...form.skills_needed, s]); setSkill(''); };
  const addResource = () => { if (!res.item) return; upd('resource_needs', [...form.resource_needs, { ...res, quantity: Number(res.quantity) }]); setRes({ item: '', quantity: 1, unit: 'pcs' }); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, volunteers_needed: Number(form.volunteers_needed) };
      const { data } = await api.post('/causes/', payload);
      toast.success('Cause posted! AI summary added.');
      nav(`/ngo/causes/${data.id}`);
    } catch (e) { toast.error(e.friendly); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-white">Post a <span className="text-gradient">new cause</span></h1>
        <p className="text-white/60 mt-2">Be specific — Gemini will craft an AI summary that hooks volunteers.</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <Card>
          <h2 className="font-heading text-lg text-white mb-3">Basics</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>Title</Label><Input className="mt-1" value={form.title} onChange={e=>upd('title', e.target.value)} required data-testid="cause-title" /></div>
            <div><Label>Category</Label>
              <Select className="mt-1" value={form.category} onChange={e=>upd('category', e.target.value)}>
                {['education','environment','healthcare','disaster','food','animal','other'].map(c => <option key={c} className="bg-[#0b0f1e]" value={c}>{c}</option>)}
              </Select>
            </div>
            <div><Label>Urgency</Label>
              <Select className="mt-1" value={form.urgency} onChange={e=>upd('urgency', e.target.value)}>
                {['low','medium','high','critical'].map(c => <option key={c} className="bg-[#0b0f1e]" value={c}>{c}</option>)}
              </Select>
            </div>
            <div><Label>City</Label><Input className="mt-1" value={form.location_city} onChange={e=>upd('location_city', e.target.value)} required /></div>
            <div><Label>Country</Label><Input className="mt-1" value={form.location_country} onChange={e=>upd('location_country', e.target.value)} required /></div>
            <div><Label>Volunteers needed</Label><Input className="mt-1" type="number" min="1" value={form.volunteers_needed} onChange={e=>upd('volunteers_needed', e.target.value)} required /></div>
            <div><Label>Cover image URL</Label><Input className="mt-1" value={form.cover_image_url} onChange={e=>upd('cover_image_url', e.target.value)} placeholder="Optional" /></div>
            <div><Label>Start date</Label><Input className="mt-1" type="date" value={form.start_date} onChange={e=>upd('start_date', e.target.value)} /></div>
            <div><Label>End date</Label><Input className="mt-1" type="date" value={form.end_date} onChange={e=>upd('end_date', e.target.value)} /></div>
          </div>
          <div className="mt-4">
            <Label>Description</Label>
            <Textarea className="mt-1" rows={5} value={form.description} onChange={e=>upd('description', e.target.value)} required placeholder="Describe the situation, what volunteers will do, and what success looks like." data-testid="cause-description" />
          </div>
        </Card>

        <Card>
          <Label>Skills needed</Label>
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {form.skills_needed.map(s => <Badge key={s} variant="violet">{s} <X size={10} className="cursor-pointer" onClick={()=>upd('skills_needed', form.skills_needed.filter(x=>x!==s))} /></Badge>)}
          </div>
          <div className="flex gap-2">
            <Input value={skill} onChange={e=>setSkill(e.target.value)} placeholder="e.g. teaching" onKeyDown={(e)=>{ if (e.key==='Enter'){ e.preventDefault(); addSkill(); } }} />
            <Button type="button" variant="secondary" onClick={addSkill}><Plus size={16} /></Button>
          </div>
        </Card>

        <Card>
          <Label>Resource needs (in-kind)</Label>
          <div className="space-y-2 mt-2 mb-3">
            {form.resource_needs.map((r, i) => (
              <div key={i} className="glass rounded-lg p-3 flex justify-between">
                <span className="text-white">{r.item}</span>
                <span className="text-white/60">{r.quantity} {r.unit}</span>
                <button type="button" onClick={()=>upd('resource_needs', form.resource_needs.filter((_,idx)=>idx!==i))} className="text-white/50 hover:text-white"><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input className="col-span-2" placeholder="Item (e.g. blankets)" value={res.item} onChange={e=>setRes(r=>({ ...r, item: e.target.value }))} />
            <Input type="number" placeholder="Qty" value={res.quantity} onChange={e=>setRes(r=>({ ...r, quantity: e.target.value }))} />
            <div className="flex gap-1">
              <Input placeholder="unit" value={res.unit} onChange={e=>setRes(r=>({ ...r, unit: e.target.value }))} />
              <Button type="button" variant="secondary" onClick={addResource}><Plus size={16} /></Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={()=>nav('/ngo/causes')}>Cancel</Button>
          <Button type="submit" disabled={busy} data-testid="cause-submit"><Save size={16} /> {busy ? 'Posting…' : 'Post cause'}</Button>
        </div>
        <div className="text-xs text-white/40 text-center">After posting, Gemini will auto-generate a 2-line AI summary <Sparkles size={10} className="inline" /></div>
      </form>
    </div>
  );
}
