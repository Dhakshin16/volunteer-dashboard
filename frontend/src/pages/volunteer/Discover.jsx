import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Input, Button, Skeleton, Select } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Search, MapPinned, Heart, Filter, Compass, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';

const CATEGORIES = ['all', 'education', 'environment', 'healthcare', 'disaster', 'food', 'animal', 'other'];
const URGENCIES = ['all', 'low', 'medium', 'high', 'critical'];

export default function VolunteerDiscover() {
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [urg, setUrg] = useState('all');
  const [bookmarks, setBookmarks] = useState(new Set());
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { (async () => {
    setLoading(true);
    try {
      const [{ data }, b] = await Promise.allSettled([
        api.get('/causes/'),
        api.get('/volunteer/bookmarks/ids'),
      ]).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : { data: [] }));
      setCauses(data || []);
      const ids = b?.data?.ids || b?.ids || [];
      setBookmarks(new Set(ids));
    } finally { setLoading(false); }
  })(); }, []);

  const toggleBookmark = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (busyId) return;
    setBusyId(id);
    const isSaved = bookmarks.has(id);
    // optimistic update
    const next = new Set(bookmarks);
    if (isSaved) next.delete(id); else next.add(id);
    setBookmarks(next);
    try {
      if (isSaved) await api.delete(`/volunteer/bookmarks/${id}`);
      else await api.post(`/volunteer/bookmarks/${id}`);
      toast.success(isSaved ? 'Removed from saved' : 'Saved for later');
    } catch (err) {
      // revert on error
      setBookmarks(bookmarks);
      toast.error(err.friendly || 'Could not update bookmark');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => causes.filter(c => {
    if (cat !== 'all' && c.category !== cat) return false;
    if (urg !== 'all' && c.urgency !== urg) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (!(c.title?.toLowerCase().includes(ql) || c.description?.toLowerCase().includes(ql) || c.location_city?.toLowerCase().includes(ql) || (c.skills_needed||[]).some(s=>s.toLowerCase().includes(ql)))) return false;
    }
    return true;
  }), [causes, cat, urg, q]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Compass size={12} /> Discover</div>
        <h1 className="font-heading text-4xl text-white mt-1">Open <span className="text-gradient">causes</span></h1>
        <p className="text-white/60 mt-2">Live causes from approved NGOs. Filter, browse, and join.</p>
      </div>

      <Card>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input className="pl-10" placeholder="Search causes…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <Select value={cat} onChange={e=>setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0b0f1e]">Category: {c}</option>)}
          </Select>
          <Select value={urg} onChange={e=>setUrg(e.target.value)}>
            {URGENCIES.map(c => <option key={c} value={c} className="bg-[#0b0f1e]">Urgency: {c}</option>)}
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-56" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16"><Heart className="mx-auto text-white/30" size={32} /><div className="text-white/60 mt-3">No causes match your filters.</div></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const saved = bookmarks.has(c.id);
            return (
              <Link key={c.id} to={`/v/causes/${c.id}`} className="block">
                <Card className="hover:-translate-y-1 transition-all h-full flex flex-col relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition bg-violet-500/40" />
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(e, c.id)}
                    data-testid={`bookmark-toggle-${c.id}`}
                    className={`absolute top-3 right-3 z-10 h-9 w-9 rounded-xl grid place-items-center backdrop-blur-md border transition ${saved ? 'bg-pink-500/30 border-pink-400/50 text-pink-100' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                    aria-label={saved ? 'Remove bookmark' : 'Save for later'}
                    title={saved ? 'Remove bookmark' : 'Save for later'}
                  >
                    {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                  <div className="flex justify-between gap-2 relative pr-12">
                    <Badge variant="cyan">{c.category}</Badge>
                    <Badge variant={c.urgency === 'critical' || c.urgency === 'high' ? 'rose' : c.urgency === 'medium' ? 'amber' : 'emerald'}>{c.urgency}</Badge>
                  </div>
                  <h3 className="font-heading text-lg text-white mt-3 line-clamp-2 relative">{c.title}</h3>
                  <p className="text-sm text-white/60 mt-2 line-clamp-3 relative">{c.ai_summary || c.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3 relative">
                    {(c.skills_needed || []).slice(0, 3).map(s => <Badge key={s} variant="violet">{s}</Badge>)}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-white/50 relative">
                    <span className="flex items-center gap-1"><MapPinned size={12} /> {c.location_city}</span>
                    <span>{c.volunteers_joined || 0} / {c.volunteers_needed} volunteers</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                    <span>by {c.ngo_name || 'NGO'}</span>
                    <span>·</span>
                    <span>{fmtRelative(c.created_at)}</span>
                    <ArrowRight className="ml-auto opacity-0 group-hover:opacity-100 transition" size={16} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
