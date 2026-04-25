import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

export { Toaster, toast };

/* Centered modal */
export function Dialog({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass-strong rounded-2xl w-full ${maxWidth} p-6 shadow-2xl`}>
        {title && <h3 className="font-heading text-2xl mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
