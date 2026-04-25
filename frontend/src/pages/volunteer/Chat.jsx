import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Textarea, Badge } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Sparkles, Send, Image as ImageIcon, X, Mic, MicOff, Bot, User2 } from 'lucide-react';

export default function VolunteerChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm Auri — your AI guide on VolunCore. How can I help you make impact today?" }
  ]);
  const [input, setInput] = useState('');
  const [imageData, setImageData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const scrollRef = useRef();
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join('');
      setInput(t);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);

  const onPick = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) return toast.error('Image too large (max 4MB)');
    const r = new FileReader(); r.onload = () => setImageData(r.result); r.readAsDataURL(f);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !imageData) return;
    const userMsg = { role: 'user', text, image: imageData };
    setMessages(m => [...m, userMsg]);
    setInput(''); setImageData(null); setBusy(true);
    try {
      const { data } = await api.post('/chat/', { message: text || '(image only)', image_base64: imageData, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages(m => [...m, { role: 'assistant', text: data.reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${e.friendly}`, error: true }]);
    } finally { setBusy(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const toggleVoice = () => {
    if (!recRef.current) return toast.error('Voice not supported');
    if (listening) { recRef.current.stop(); setListening(false); } else { recRef.current.start(); setListening(true); }
  };

  const SUGGESTED = [
    'Find me a cause this weekend',
    'How do I report a flooded street?',
    'Tips to recruit more volunteers',
    'Make me a 30-day impact plan',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white shadow-lg shadow-violet-500/40 animate-pulse-ring">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-white">Auri — your AI co-pilot</h1>
          <div className="text-xs text-white/50 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Online — multimodal AI co-pilot
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 h-9 w-9 rounded-full grid place-items-center ${m.role === 'user' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white'}`}>
                {m.role === 'user' ? <User2 size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[78%] ${m.role === 'user' ? 'text-right' : ''}`}>
                {m.image && <img src={m.image} alt="" className="rounded-xl max-h-48 mb-2 ml-auto" />}
                {m.text && (
                  <div className={`inline-block whitespace-pre-wrap text-sm rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-white border border-violet-400/20' : (m.error ? 'glass border-rose-400/30 text-rose-200' : 'glass text-white')}`}>
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white"><Bot size={16} /></div>
              <div className="glass rounded-2xl px-4 py-3 inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {SUGGESTED.map(s => <button key={s} className="glass rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10" onClick={()=>setInput(s)}>{s}</button>)}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 p-3">
          {imageData && (
            <div className="flex items-center gap-2 mb-2 glass rounded-lg p-2">
              <img src={imageData} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <span className="text-xs text-white/60">Image attached</span>
              <button onClick={()=>setImageData(null)} className="ml-auto text-white/60 hover:text-white"><X size={14} /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Button size="icon" variant="ghost" onClick={()=>fileRef.current?.click()} aria-label="image"><ImageIcon size={18} /></Button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
            <Button size="icon" variant={listening ? 'danger' : 'ghost'} onClick={toggleVoice} aria-label="voice">
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
            <Textarea
              rows={1}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask Auri anything…"
              className="min-h-[44px] max-h-32 py-3"
              data-testid="auri-chat-input"
            />
            <Button onClick={send} disabled={busy || (!input && !imageData)} data-testid="auri-chat-send"><Send size={16} /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
