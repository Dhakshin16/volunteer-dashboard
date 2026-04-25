import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Label } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import AuroraBackground from '@/components/AuroraBackground';
import { api } from '@/lib/api';
import { Building2, Save, X, Plus } from 'lucide-react';

const FOCUS_OPTIONS = ['education', 'environment', 'healthcare', 'disaster', 'food', 'animal', 'women', 'elderly', 'children', 'digital'];

function Chip({ children, onRemove, onClick, active }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all ${active ? 'bg-cyan-500/20 text-white border-cyan-400/40' : 'glass border-white/15 text-white/80 hover:bg-white/10'}`}>
      {children}{onRemove && <X size={12} className="opacity-70 hover:opacity-100" onClick={(e)=>{ e.stopPropagation(); onRemove(); }} />}
    </button>
  );
}

export default function NgoRegister() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    org_name: '', mission: '', focus_areas: [], city: '', country: '',
    website: '', contact_email: '', contact_phone: '', registration_id: '',
  });
  useEffect(() => { (async () => {
    try {
      const { data } = await api.get('/ngo/me');
      if (data) {
        if (data.is_approved) nav('/ngo');
        else nav('/ngo/pending');
      }
    } catch {}
  })(); /* eslint-disable-next-line */ }, []);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.focus_areas.length === 0) { toast.error('Pick at least 1 focus area'); return; }
    setBusy(true);
    try {
      await api.post('/ngo/me', form);
      toast.success('Submitted! Awaiting admin approval.');
      nav('/ngo/pending');
    } catch (e) { toast.error(e.friendly); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen p-6 relative">
      <AuroraBackground />
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs uppercase tracking-widest text-white/70"><Building2 size={12} /> NGO onboarding</div>
          <h1 className="font-heading text-4xl text-white mt-4">Tell us about your <span className="text-gradient">organisation</span></h1>
          <p className="text-white/60 mt-2">After admin approval, you can post causes & coordinate volunteers.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <Card>
            <h2 className="font-heading text-lg text-white mb-3">Org details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Organisation name</Label><Input className="mt-1" value={form.org_name} onChange={e=>upd('org_name', e.target.value)} required data-testid="ngo-org-name" /></div>
              <div><Label>Registration ID</Label><Input className="mt-1" value={form.registration_id} onChange={e=>upd('registration_id', e.target.value)} placeholder="Optional" /></div>
              <div><Label>City</Label><Input className="mt-1" value={form.city} onChange={e=>upd('city', e.target.value)} required /></div>
              <div><Label>Country</Label><Input className="mt-1" value={form.country} onChange={e=>upd('country', e.target.value)} required /></div>
              <div><Label>Website</Label><Input className="mt-1" type="url" value={form.website} onChange={e=>upd('website', e.target.value)} placeholder="https://…" /></div>
              <div><Label>Contact email</Label><Input className="mt-1" type="email" value={form.contact_email} onChange={e=>upd('contact_email', e.target.value)} required /></div>
              <div><Label>Contact phone</Label><Input className="mt-1" value={form.contact_phone} onChange={e=>upd('contact_phone', e.target.value)} /></div>
            </div>
            <div className="mt-4">
              <Label>Mission</Label>
              <Textarea className="mt-1" rows={3} value={form.mission} onChange={e=>upd('mission', e.target.value)} required placeholder="What does your org stand for?" />
            </div>
          </Card>
          <Card>
            <Label>Focus areas</Label>
            <div className="flex flex-wrap gap-2 mt-3">
              {FOCUS_OPTIONS.map(f => (
                <Chip key={f} active={form.focus_areas.includes(f)} onClick={() => upd('focus_areas', form.focus_areas.includes(f) ? form.focus_areas.filter(x=>x!==f) : [...form.focus_areas, f])}>{f}</Chip>
              ))}
            </div>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={busy} data-testid="ngo-register-submit"><Save size={16} /> {busy ? 'Submitting…' : 'Submit for approval'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
