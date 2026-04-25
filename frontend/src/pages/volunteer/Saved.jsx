import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Skeleton } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Bookmark, BookmarkX, MapPinned, ArrowRight, Compass } from 'lucide-react';

export default function VolunteerSaved() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/volunteer/bookmarks');
      setItems(data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (cause_id) => {
    try {
      await api.delete(`/volunteer/bookmarks/${cause_id}`);
      setItems(prev => prev.filter(b => b.cause_id !== cause_id));
      toast.success('Removed from saved');
    } catch (e) { toast.error(e.friendly || 'Could not remove'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Bookmark size={12} /> Saved</div>
        <h1 className="font-heading text-4xl text-white mt-1">Causes <span className="text-gradient">to come back to</span></h1>
        <p className="text-white/60 mt-2">Quietly bookmarked — pick one up whenever you have the time.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-56" />)}</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16" data-testid="saved-empty-state">
          <Bookmark className="mx-auto text-white/30" size={32} />
          <div className="text-white/60 mt-3">No saved causes yet.</div>
          <Link to="/v/discover"><Button className="mt-5"><Compass size={16} /> Discover causes</Button></Link>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(b => {
            const c = b.cause || {};
            return (
              <Card key={b.id} data-testid={`saved-card-${b.cause_id}`} className="relative overflow-hidden group h-full flex flex-col">
                <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition bg-pink-500/40" />
                <div className="flex justify-between gap-2 relative">
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
                  <span>Saved {fmtRelative(b.created_at)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 relative">
                  <Link to={`/v/causes/${b.cause_id}`} className="flex-1"><Button variant="secondary" className="w-full">Open <ArrowRight size={14} /></Button></Link>
                  <Button variant="ghost" size="icon" onClick={() => remove(b.cause_id)} aria-label="Remove" data-testid={`saved-remove-${b.cause_id}`}><BookmarkX size={16} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
