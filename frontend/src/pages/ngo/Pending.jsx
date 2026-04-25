import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/ui/primitives';
import AuroraBackground from '@/components/AuroraBackground';
import { api } from '@/lib/api';
import { Clock, CheckCircle2, RefreshCcw, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NgoPending() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [ngo, setNgo] = useState(null);
  const [tick, setTick] = useState(0);

  const load = async () => {
    try {
      const { data } = await api.get('/ngo/me');
      if (!data) { nav('/ngo/register'); return; }
      setNgo(data);
      if (data.is_approved) nav('/ngo');
    } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tick]);

  if (!ngo) return null;

  return (
    <div className="min-h-screen grid place-items-center p-6 relative">
      <AuroraBackground />
      <Card className="max-w-xl w-full text-center glass-strong aurora-border relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl bg-amber-500/20" />
        <div className="relative">
          {ngo.rejection_reason ? (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-500/20 grid place-items-center mb-4"><AlertTriangle className="text-rose-300" size={28} /></div>
              <h1 className="font-heading text-3xl text-white">Submission rejected</h1>
              <p className="text-white/65 mt-3">Reason: <span className="text-rose-200">{ngo.rejection_reason}</span></p>
              <Button className="mt-6" onClick={() => nav('/ngo/register')}>Edit and resubmit</Button>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/20 grid place-items-center mb-4 animate-pulse-ring"><Clock className="text-amber-300" size={28} /></div>
              <h1 className="font-heading text-3xl text-white">Awaiting approval</h1>
              <p className="text-white/65 mt-3">An admin is reviewing <span className="text-white">{ngo.org_name}</span>. We'll unlock the full console once approved.</p>
              <Badge variant="amber" className="mt-4">Status: pending</Badge>
              <div className="flex justify-center gap-2 mt-6">
                <Button variant="secondary" onClick={() => setTick(t=>t+1)}><RefreshCcw size={14} /> Check again</Button>
                <Button variant="ghost" onClick={async ()=>{ await logout(); nav('/'); }}><LogOut size={14} /> Sign out</Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
