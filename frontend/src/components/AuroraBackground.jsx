import React from 'react';

/* Animated aurora gradient mesh background — fixed full-viewport. */
export default function AuroraBackground({ intensity = 1 }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Big violet blob */}
      <div
        className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-3xl animate-float-slow opacity-70"
        style={{
          background: 'radial-gradient(circle, hsl(263 88% 60% / .55), transparent 60%)',
          opacity: 0.65 * intensity,
        }}
      />
      {/* Cyan blob */}
      <div
        className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full blur-3xl animate-float opacity-60"
        style={{
          background: 'radial-gradient(circle, hsl(188 91% 50% / .50), transparent 60%)',
          opacity: 0.6 * intensity,
        }}
      />
      {/* Pink blob */}
      <div
        className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full blur-3xl animate-drift opacity-60"
        style={{
          background: 'radial-gradient(circle, hsl(326 90% 65% / .45), transparent 60%)',
          opacity: 0.55 * intensity,
        }}
      />
      {/* Sub grain */}
      <div className="absolute inset-0 grain" />
    </div>
  );
}
