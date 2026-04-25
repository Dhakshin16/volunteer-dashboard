import React, { useEffect, useState } from 'react';
import { Card, Button, Skeleton } from '@/components/ui/primitives';
import { toast } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Mail, MessageSquare, Bell, ShieldCheck } from 'lucide-react';

function ToggleRow({ icon: Icon, title, description, checked, onChange, testId }) {
  return (
    <div className="flex items-start gap-4 py-5 border-b border-white/5 last:border-0">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-400/20 grid place-items-center shrink-0">
        <Icon size={18} className="text-violet-200" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">{title}</div>
        <div className="text-sm text-white/55 mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors shrink-0 mt-1 ${
          checked ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/notifications/preferences');
        setPrefs(data);
      } catch (e) {
        toast.error(e.friendly || 'Failed to load preferences');
      }
    })();
  }, []);

  const update = async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const { data } = await api.put('/notifications/preferences', patch);
      setPrefs(data);
      toast.success('Preferences saved');
    } catch (e) {
      toast.error(e.friendly || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-heading text-4xl text-white">Notification <span className="text-gradient">preferences</span></h1>
        <p className="text-white/60 mt-2">Choose how VolunCore reaches you. Critical security messages will always be sent.</p>
      </div>

      <Card className="p-2">
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs uppercase tracking-widest text-white/40">Channels</div>
        </div>
        <div className="px-4">
          <ToggleRow
            icon={Bell}
            title="In-app notifications"
            description="The bell in the header. Real-time updates while you browse."
            checked={!!prefs.in_app}
            onChange={(v) => update({ in_app: v })}
            testId="prefs-toggle-in-app"
          />
          <ToggleRow
            icon={Mail}
            title="Email"
            description="Approval, rejection, new volunteers, event reminders, and weekly highlights."
            checked={!!prefs.email}
            onChange={(v) => update({ email: v })}
            testId="prefs-toggle-email"
          />
          <ToggleRow
            icon={MessageSquare}
            title="SMS"
            description="Critical events only — approvals, rejections, and last-minute event changes."
            checked={!!prefs.sms}
            onChange={(v) => update({ sms: v })}
            testId="prefs-toggle-sms"
          />
        </div>
      </Card>

      <Card className="flex items-start gap-4 bg-violet-500/5 border border-violet-400/15">
        <div className="h-10 w-10 rounded-xl bg-violet-500/20 grid place-items-center shrink-0">
          <ShieldCheck size={18} className="text-violet-200" />
        </div>
        <div className="text-sm text-white/70">
          <div className="text-white font-medium">A note on critical alerts</div>
          <p className="mt-1">
            For account safety we still email you about role changes and approval status even if a channel is off.
            Turn channels back on anytime — your in-app inbox keeps a full history.
          </p>
        </div>
      </Card>

      {saving && <div className="text-xs text-white/40">Saving…</div>}
    </div>
  );
}
