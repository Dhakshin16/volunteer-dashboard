import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Inbox, Settings } from 'lucide-react';
import { api } from '@/lib/api';

function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const kindStyles = {
  success: 'border-emerald-400/30 bg-emerald-500/10',
  warning: 'border-amber-400/30 bg-amber-500/10',
  danger: 'border-rose-400/30 bg-rose-500/10',
  info: 'border-violet-400/30 bg-violet-500/10',
};

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const prefsLink = (() => {
    const p = window.location.pathname;
    if (p.startsWith('/admin')) return '/admin/notifications';
    if (p.startsWith('/ngo')) return '/ngo/notifications';
    return '/v/notifications';
  })();

  const unread = items.filter(n => !n.read).length;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications/me');
      setItems(data || []);
    } catch (_) {
      // silent — bell shouldn't block UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleClick = async (n) => {
    if (!n.read) {
      try { await api.post(`/notifications/${n.id}/read`); } catch (_) {}
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.link) {
      setOpen(false);
      nav(n.link);
    }
  };

  const markAll = async () => {
    try { await api.post('/notifications/read-all'); } catch (_) {}
    setItems(prev => prev.map(x => ({ ...x, read: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        data-testid="notification-bell-button"
        className="relative h-9 w-9 grid place-items-center rounded-xl border border-white/10 hover:border-violet-400/40 hover:bg-white/5 transition text-white/80 hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/40"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-panel"
          className="absolute right-0 mt-2 w-[360px] max-w-[92vw] z-50 rounded-2xl glass-strong border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="font-heading text-white">Notifications</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAll}
                disabled={unread === 0}
                data-testid="notification-mark-all-read"
                className="text-xs text-violet-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); nav(prefsLink); }}
                data-testid="notification-prefs-link"
                className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                title="Preferences"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-white/50 text-sm">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <Inbox className="mx-auto mb-2 opacity-60" size={26} />
                <div className="text-sm">No notifications yet</div>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      data-testid={`notification-item-${n.id}`}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition hover:bg-white/5 ${!n.read ? 'bg-white/[0.03]' : ''}`}
                    >
                      <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg border ${kindStyles[n.kind] || kindStyles.info} grid place-items-center`}>
                        {n.read ? <Check size={14} className="text-white/60" /> : <Bell size={14} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-white/80'}`}>{n.title}</div>
                          {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400 shrink-0" />}
                        </div>
                        <div className="text-xs text-white/55 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-white/35 mt-1 uppercase tracking-wider">{timeAgo(n.created_at)}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
