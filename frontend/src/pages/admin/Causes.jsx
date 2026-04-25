import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Skeleton, Input } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { fmtRelative } from '@/lib/utils';
import { Heart, MapPinned, Search } from 'lucide-react';

export default function AdminCauses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => { (async () => {
    try { const { data } = await api.get('/admin/causes'); setItems(data || []); }
    finally { setLoading(false); }
  })(); }, []);

  const filtered = items.filter(c => !q || c.title?.toLowerCase().includes(q.toLowerCase()) || c.ngo_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl text-white">All <span className="text-gradient">causes</span></h1>
        <p className="text-white/60 mt-2">Platform-wide moderation view.</p>
      </div>
      <Card>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input className="pl-10" placeholder="Search title or NGO…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
      </Card>
      {loading ? <div className="space-y-3">{[1,2].map(i=><Skeleton key={i} className="h-24" />)}</div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <Link key={c.id} to={`/admin/causes/${c.id}`}>
              <Card className="hover:-translate-y-1 transition">
                <div className="flex justify-between">
                  <Badge variant="cyan">{c.category}</Badge>
                  <Badge variant={c.status === 'open' ? 'emerald' : 'amber'}>{c.status}</Badge>
                </div>
                <h3 className="font-heading text-lg text-white mt-2">{c.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-white/50 mt-2">
                  <span>by {c.ngo_name}</span>
                  <span className="flex items-center gap-1"><MapPinned size={12} /> {c.location_city}</span>
                  <span>{fmtRelative(c.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
