import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, Skeleton, ProgressBar } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { Plus, MapPinned, ArrowRight, Heart } from 'lucide-react';

export default function NgoCauses() {
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { const { data } = await api.get('/ngo/me/causes'); setCauses(data || []); }
    finally { setLoading(false); }
  })(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-4xl text-white">My <span className="text-gradient">causes</span></h1>
          <p className="text-white/60 mt-2">Manage your active and completed causes.</p>
        </div>
        <Link to="/ngo/causes/new"><Button><Plus size={16} /> New cause</Button></Link>
      </div>
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={i} className="h-44" />)}</div>
      ) : causes.length === 0 ? (
        <Card className="text-center py-16"><Heart className="mx-auto text-white/30" size={32} /><div className="text-white/60 mt-3">No causes yet</div><Link to="/ngo/causes/new"><Button className="mt-4">Create your first cause</Button></Link></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {causes.map(c => (
            <Link key={c.id} to={`/ngo/causes/${c.id}`} className="block">
              <Card className="hover:-translate-y-1 transition-all">
                <div className="flex justify-between mb-2">
                  <Badge variant="cyan">{c.category}</Badge>
                  <Badge variant={c.status === 'open' ? 'emerald' : 'amber'}>{c.status}</Badge>
                </div>
                <h3 className="font-heading text-xl text-white">{c.title}</h3>
                <p className="text-sm text-white/60 mt-2 line-clamp-2">{c.ai_summary || c.description}</p>
                <div className="flex justify-between text-xs text-white/50 mt-3"><span className="flex items-center gap-1"><MapPinned size={12} /> {c.location_city}</span><span>{c.volunteers_joined || 0}/{c.volunteers_needed}</span></div>
                <ProgressBar className="mt-2" value={c.volunteers_joined || 0} max={c.volunteers_needed || 1} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
