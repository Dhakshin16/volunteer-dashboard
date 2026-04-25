import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Textarea, Badge, Skeleton } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { FileText, Camera, Mic, MicOff, MapPinned, AlertTriangle, Sparkles, Send, Image as ImageIcon, X } from 'lucide-react';

function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);
  const start = () => { if (!recRef.current) return; setTranscript(''); recRef.current.start(); setListening(true); };
  const stop = () => { recRef.current?.stop(); setListening(false); };
  return { supported, listening, transcript, setTranscript, start, stop };
}

export default function VolunteerReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [coords, setCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef();
  const speech = useSpeechRecognition();

  const load = async () => {
    try { const { data } = await api.get('/reports/me'); setReports(data || []); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast.error('Image too large (max 4MB)'); return; }
    const r = new FileReader();
    r.onload = () => setImageData(r.result);
    r.readAsDataURL(f);
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success('Location attached'); },
      () => toast.error('Could not get location'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const polishVoice = async () => {
    if (!speech.transcript) return;
    try {
      const { data } = await api.post('/reports/polish-voice', { transcript: speech.transcript });
      const polished = data.polished || speech.transcript;
      setText(prev => (prev ? prev + '\n\n' + polished : polished));
      speech.setTranscript('');
      toast.success('AI cleaned your transcript');
    } catch (e) { toast.error(e.friendly); }
  };

  const submit = async () => {
    if (!text && !imageData) { toast.error('Add some text or an image'); return; }
    setSubmitting(true);
    try {
      const payload = {
        text: text + (speech.transcript ? '\n\n' + speech.transcript : ''),
        image_base64: imageData,
        voice_transcript: speech.transcript || null,
        location_lat: coords?.lat, location_lng: coords?.lng,
      };
      const { data } = await api.post('/reports/', payload);
      const a = data.ai_analysis || {};
      if (a.is_crisis) toast.warning('Crisis detected — admins have been notified');
      else toast.success(`Report submitted • ${a.urgency || 'medium'} urgency`);
      setText(''); setImageData(null); setCoords(null); speech.setTranscript('');
      setOpen(false);
      load();
    } catch (e) { toast.error(e.friendly); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-4xl text-white">Field <span className="text-gradient">reports</span></h1>
          <p className="text-white/60 mt-2">Photo + voice + text from the field. Gemini analyzes urgency, needs, and crises.</p>
        </div>
        <Button onClick={()=>setOpen(true)}><FileText size={16} /> New report</Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[1,2].map(i=><Skeleton key={i} className="h-40" />)}</div>
      ) : reports.length === 0 ? (
        <Card className="text-center py-16"><FileText className="mx-auto text-white/30" size={32} /><div className="text-white/60 mt-3">No reports yet. Submit your first one.</div></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map(r => {
            const a = r.ai_analysis || {};
            return (
              <Card key={r.id} className="relative overflow-hidden">
                {r.is_crisis && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500 animate-pulse" />
                )}
                <div className="flex justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={a.urgency === 'critical' || a.urgency === 'high' ? 'rose' : a.urgency === 'medium' ? 'amber' : 'emerald'}>
                      {a.urgency || 'medium'}
                    </Badge>
                    <Badge variant="cyan">{a.category || 'other'}</Badge>
                    <Badge>{a.sentiment || 'neutral'}</Badge>
                    {r.is_crisis && <Badge variant="rose"><AlertTriangle size={10} /> CRISIS</Badge>}
                  </div>
                  <span className="text-xs text-white/40">{fmtRelative(r.created_at)}</span>
                </div>
                <p className="text-sm text-white mt-3 line-clamp-3">{r.text}</p>
                {a.summary && <div className="glass rounded-lg p-3 mt-3 text-xs text-white/70 italic"><Sparkles size={12} className="inline mr-1 text-violet-300" />{a.summary}</div>}
                {(a.needs || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {a.needs.map(n => <Badge key={n} variant="violet">{n}</Badge>)}
                  </div>
                )}
                {a.action_recommendation && (
                  <div className="text-xs text-cyan-300 mt-2">→ {a.action_recommendation}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={()=>setOpen(false)} title="Submit field report" maxWidth="max-w-2xl">
        <div className="space-y-3">
          <Textarea rows={5} placeholder="What's happening on the ground?" value={text} onChange={e=>setText(e.target.value)} />

          {/* Voice */}
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            {!speech.supported ? (
              <span className="text-xs text-white/50">Voice not supported in this browser</span>
            ) : !speech.listening ? (
              <Button size="sm" variant="secondary" onClick={speech.start}><Mic size={14} /> Speak</Button>
            ) : (
              <Button size="sm" variant="danger" onClick={speech.stop}><MicOff size={14} /> Stop</Button>
            )}
            {speech.listening && (
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className="w-1 h-5 bg-violet-400 rounded-full animate-wave" style={{ animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
            )}
            <span className="text-xs text-white/60 italic flex-1 line-clamp-1">{speech.transcript || 'Speak — Gemini will polish your transcript.'}</span>
            {speech.transcript && (
              <Button size="sm" variant="ghost" onClick={polishVoice}><Sparkles size={14} /> Polish</Button>
            )}
          </div>

          {/* Image */}
          {imageData ? (
            <div className="relative">
              <img src={imageData} alt="" className="w-full max-h-72 object-cover rounded-xl" />
              <button onClick={()=>setImageData(null)} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 grid place-items-center text-white"><X size={14} /></button>
            </div>
          ) : (
            <Button variant="secondary" onClick={()=>fileRef.current?.click()}><ImageIcon size={14} /> Add photo</Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />

          {/* Location */}
          <div className="flex items-center justify-between glass rounded-xl p-3 text-sm">
            {coords ? (
              <span className="text-emerald-300 flex items-center gap-1"><MapPinned size={14} /> {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
            ) : (
              <span className="text-white/50">No location attached</span>
            )}
            <Button size="sm" variant="ghost" onClick={getLocation}><MapPinned size={14} /> Attach</Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}><Send size={14} /> {submitting ? 'Analyzing…' : 'Submit'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
