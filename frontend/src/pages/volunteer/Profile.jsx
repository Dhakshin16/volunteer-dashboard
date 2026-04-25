import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Label, Badge } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Sparkles, X, Plus, Save } from 'lucide-react';

const SUGGESTED_SKILLS = ['teaching', 'first aid', 'fundraising', 'graphic design', 'translation', 'logistics', 'photography', 'public speaking', 'data analysis', 'cooking', 'driving', 'tutoring', 'web development', 'social media', 'mentoring'];

function Chip({ children, onRemove, onClick, active }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all ${active ? 'bg-violet-500/20 text-white border-violet-400/40 glow-violet' : 'glass border-white/15 text-white/80 hover:bg-white/10'}`}>
      {children}
      {onRemove && <X size={12} className="opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemove(); }} />}
    </button>
  );
}

export default function VolunteerProfile() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: '', age: '', skills: [], interests: [], languages: [], city: '', country: '',
    availability_hours_per_week: '', bio: '', phone: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get('/volunteer/me');
      if (data) setForm({ ...form, ...data });
    } catch {}
  })(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem = (k, v) => { v = (v || '').trim().toLowerCase(); if (!v) return; if (form[k].includes(v)) return; update(k, [...form[k], v]); };
  const removeItem = (k, v) => update(k, form[k].filter(x => x !== v));

  const aiExtract = async () => {
    if (!form.bio || form.bio.length < 20) { toast.error('Write a longer bio first (≥20 chars)'); return; }
    setExtracting(true);
    try {
      const { data } = await api.post('/volunteer/extract-skills', { bio: form.bio });
      const merged = Array.from(new Set([...form.skills, ...(data.skills || [])]));
      update('skills', merged);
      toast.success(`Added ${data.skills?.length || 0} AI-extracted skills`);
    } catch (e) { toast.error(e.friendly); } finally { setExtracting(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
        availability_hours_per_week: form.availability_hours_per_week ? Number(form.availability_hours_per_week) : null,
      };
      await api.post('/volunteer/me', payload);
      toast.success('Profile saved!');
      nav('/v');
    } catch (e) { toast.error(e.friendly); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-white">Your <span className="text-gradient">volunteer profile</span></h1>
        <p className="text-white/60 mt-2">The richer your profile, the better Auri can match you to causes that move you.</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <h2 className="font-heading text-xl text-white mb-4">About you</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input className="mt-1" value={form.full_name || ''} onChange={e=>update('full_name', e.target.value)} required /></div>
            <div><Label>Age</Label><Input className="mt-1" type="number" min="13" max="100" value={form.age || ''} onChange={e=>update('age', e.target.value)} /></div>
            <div><Label>City</Label><Input className="mt-1" value={form.city || ''} onChange={e=>update('city', e.target.value)} /></div>
            <div><Label>Country</Label><Input className="mt-1" value={form.country || ''} onChange={e=>update('country', e.target.value)} /></div>
            <div><Label>Phone (optional)</Label><Input className="mt-1" value={form.phone || ''} onChange={e=>update('phone', e.target.value)} /></div>
            <div><Label>Hours / week</Label><Input className="mt-1" type="number" min="0" max="100" value={form.availability_hours_per_week || ''} onChange={e=>update('availability_hours_per_week', e.target.value)} /></div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Label>Tell us about yourself</Label>
              <Button type="button" variant="secondary" size="sm" onClick={aiExtract} disabled={extracting}>
                <Sparkles size={14} /> {extracting ? 'Extracting…' : 'AI: extract skills'}
              </Button>
            </div>
            <Textarea className="mt-1" rows={4} value={form.bio || ''} onChange={e=>update('bio', e.target.value)} placeholder="What drives you? What kind of impact would you love to create?" />
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl text-white mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.skills.map(s => <Chip key={s} onRemove={() => removeItem('skills', s)}>{s}</Chip>)}
          </div>
          <div className="flex gap-2">
            <Input value={skillInput} onChange={e=>setSkillInput(e.target.value)} placeholder="Add a skill…" onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addItem('skills', skillInput); setSkillInput(''); } }} />
            <Button type="button" variant="secondary" onClick={()=>{ addItem('skills', skillInput); setSkillInput(''); }}><Plus size={16} /></Button>
          </div>
          <div className="mt-4">
            <Label>Suggestions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTED_SKILLS.filter(s=>!form.skills.includes(s)).slice(0, 12).map(s => <Chip key={s} onClick={() => addItem('skills', s)}>+ {s}</Chip>)}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl text-white mb-4">Interests & Languages</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Interest areas</Label>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                {form.interests.map(s => <Chip key={s} onRemove={() => removeItem('interests', s)}>{s}</Chip>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {['education','environment','healthcare','disaster','food','animal','women','elderly','children','digital'].filter(s=>!form.interests.includes(s)).map(s => <Chip key={s} onClick={() => addItem('interests', s)}>+ {s}</Chip>)}
              </div>
            </div>
            <div>
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                {form.languages.map(s => <Chip key={s} onRemove={() => removeItem('languages', s)}>{s}</Chip>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {['english','hindi','tamil','telugu','marathi','bengali','spanish','french'].filter(s=>!form.languages.includes(s)).map(s => <Chip key={s} onClick={() => addItem('languages', s)}>+ {s}</Chip>)}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={()=>nav('/v')}>Cancel</Button>
          <Button type="submit" disabled={busy} className="min-w-[140px]"><Save size={16} /> {busy ? 'Saving…' : 'Save profile'}</Button>
        </div>
      </form>
    </div>
  );
}
