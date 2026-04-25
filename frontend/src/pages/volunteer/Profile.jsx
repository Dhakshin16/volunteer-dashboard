import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Label } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Sparkles, X, Plus, Save, Camera, Trash2, User } from 'lucide-react';

const SUGGESTED_SKILLS = ['teaching', 'first aid', 'fundraising', 'graphic design', 'translation', 'logistics', 'photography', 'public speaking', 'data analysis', 'cooking', 'driving', 'tutoring', 'web development', 'social media', 'mentoring'];

function Chip({ children, onRemove, onClick, active }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all ${active ? 'bg-violet-500/20 text-white border-violet-400/40 glow-violet' : 'glass border-white/15 text-white/80 hover:bg-white/10'}`}>
      {children}
      {onRemove && <X size={12} className="opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemove(); }} />}
    </button>
  );
}

const PRESET_AVATARS = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-pink-500 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-500 to-purple-500',
];

export default function VolunteerProfile() {
  const nav = useNavigate();
  const fileRef = useRef();
  const [form, setForm] = useState({
    full_name: '', age: '', skills: [], interests: [], languages: [], city: '', country: '',
    availability_hours_per_week: '', bio: '', phone: '', photo_url: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get('/volunteer/me');
      if (data) setForm(f => ({ ...f, ...data }));
    } catch {}
  })(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem = (k, v) => { v = (v || '').trim().toLowerCase(); if (!v) return; if (form[k].includes(v)) return; update(k, [...form[k], v]); };
  const removeItem = (k, v) => update(k, form[k].filter(x => x !== v));

  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast.error('Please pick an image file'); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error('Image too large (max 2 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      update('photo_url', reader.result);
      toast.success('Photo selected — save to keep it');
    };
    reader.readAsDataURL(f);
  };

  const pickPreset = (gradient) => {
    update('photo_url', `gradient::${gradient}`);
  };

  const aiExtract = async () => {
    if (!form.bio || form.bio.length < 20) { toast.error('Write a longer bio first (≥20 chars)'); return; }
    setExtracting(true);
    try {
      const { data } = await api.post('/volunteer/extract-skills', { bio: form.bio });
      const newOnes = (data.skills || []).filter(s => !form.skills.includes(s));
      const merged = Array.from(new Set([...form.skills, ...(data.skills || [])]));
      update('skills', merged);
      if (newOnes.length === 0) {
        toast.info('No new skills found beyond what you already have');
      } else {
        toast.success(`Added ${newOnes.length} smart-extracted skill${newOnes.length === 1 ? '' : 's'}`);
      }
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

  const photo = form.photo_url || '';
  const isGradient = photo.startsWith('gradient::');
  const gradient = isGradient ? photo.replace('gradient::', '') : 'from-violet-500 via-fuchsia-500 to-cyan-400';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-white">Your <span className="text-gradient">volunteer profile</span></h1>
        <p className="text-white/60 mt-2">The richer your profile, the better Auri can match you to causes that move you.</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        {/* Avatar card */}
        <Card>
          <h2 className="font-heading text-xl text-white mb-4">Profile photo</h2>
          <div className="flex items-start gap-6 flex-wrap">
            <div className="relative">
              <div className={`h-28 w-28 rounded-3xl overflow-hidden grid place-items-center text-white shadow-xl shadow-black/40 ${(!photo || isGradient) ? `bg-gradient-to-br ${gradient}` : ''}`}>
                {photo && !isGradient ? (
                  <img src={photo} alt="avatar" data-testid="profile-avatar-preview" className="h-full w-full object-cover" />
                ) : (
                  <User size={42} />
                )}
              </div>
              {(photo) && (
                <button
                  type="button"
                  onClick={() => update('photo_url', '')}
                  data-testid="profile-avatar-remove"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-rose-500/90 hover:bg-rose-500 grid place-items-center text-white shadow-lg shadow-rose-500/40"
                  aria-label="Remove photo"
                ><Trash2 size={14} /></button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} data-testid="profile-avatar-upload">
                  <Camera size={14} /> Upload photo
                </Button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Or pick a vibe</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AVATARS.map(g => (
                    <button
                      type="button"
                      key={g}
                      data-testid={`profile-avatar-preset-${g}`}
                      onClick={() => pickPreset(g)}
                      className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${g} ring-2 transition ${photo === `gradient::${g}` ? 'ring-white scale-110' : 'ring-transparent hover:scale-110'}`}
                      aria-label={`Avatar ${g}`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-white/40 mt-3">PNG / JPG up to 2 MB. Your photo appears on the leaderboard, NGO console, and shareable impact card.</div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl text-white mb-4">About you</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input className="mt-1" value={form.full_name || ''} onChange={e=>update('full_name', e.target.value)} required data-testid="profile-full-name" /></div>
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
          <Button type="submit" disabled={busy} className="min-w-[140px]" data-testid="profile-save-btn"><Save size={16} /> {busy ? 'Saving…' : 'Save profile'}</Button>
        </div>
      </form>
    </div>
  );
}
