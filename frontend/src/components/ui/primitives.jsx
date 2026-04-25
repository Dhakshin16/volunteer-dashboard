/* Custom minimal UI primitives styled for Aurora glass theme */
import React from 'react';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
  const variants = {
    primary: 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white hover:opacity-90 shadow-lg shadow-violet-500/30',
    secondary: 'glass text-white hover:bg-white/10 border-white/15',
    ghost: 'text-white/80 hover:text-white hover:bg-white/5',
    outline: 'border border-white/15 text-white hover:bg-white/5',
    danger: 'bg-rose-500/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/30',
    success: 'bg-emerald-500/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
  };
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base', icon: 'h-10 w-10' };
  return (
    <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export const Card = React.forwardRef(({ className, glass = true, ...props }, ref) => (
  <div ref={ref} className={cn(glass ? 'glass' : 'bg-card', 'rounded-2xl p-6 transition-all duration-300', className)} {...props} />
));
Card.displayName = 'Card';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/40 transition-all', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('w-full min-h-[100px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/40 resize-none transition-all', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export function Label({ className, ...props }) {
  return <label className={cn('text-xs font-medium uppercase tracking-wider text-white/60', className)} {...props} />;
}

export function Badge({ children, className, variant = 'default' }) {
  const variants = {
    default: 'bg-white/10 text-white/80 border-white/15',
    violet: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
    cyan: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    pink: 'bg-pink-500/15 text-pink-200 border-pink-400/30',
    amber: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    rose: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  };
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', variants[variant], className)}>{children}</span>;
}

export function Skeleton({ className }) {
  return <div className={cn('rounded-lg bg-white/5 shimmer', className)} />;
}

export function Avatar({ src, name, size = 40, className }) {
  // Support our gradient placeholder format: "gradient::from-x to-y"
  if (src && typeof src === 'string' && src.startsWith('gradient::')) {
    const grad = src.replace('gradient::', '');
    const ini = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div style={{ width: size, height: size }} className={cn(`rounded-full bg-gradient-to-br ${grad} text-white grid place-items-center font-semibold text-sm`, className)}>
        {ini}
      </div>
    );
  }
  if (src) return <img src={src} alt={name || ''} style={{ width: size, height: size }} className={cn('rounded-full object-cover', className)} />;
  const ini = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size }} className={cn('rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white grid place-items-center font-semibold text-sm', className)}>
      {ini}
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full h-2 rounded-full bg-white/5 overflow-hidden', className)}>
      <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all" style={{ width: pct + '%' }} />
    </div>
  );
}
