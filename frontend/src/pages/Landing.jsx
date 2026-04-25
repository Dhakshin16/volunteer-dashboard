import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Badge } from '@/components/ui/primitives';
import AuroraBackground from '@/components/AuroraBackground';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Compass, MapPinned, BrainCircuit, Heart, Users, ShieldCheck, ArrowRight, Zap, Globe2, BarChart3 } from 'lucide-react';

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-heading text-3xl sm:text-4xl text-gradient bg-gradient-anim font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-widest text-white/50 mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc, color }) {
  return (
    <div className="glass rounded-2xl p-6 hover:-translate-y-1 hover:bg-white/5 transition-all group relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition ${color}`} />
      <Icon size={28} className="text-white relative" />
      <h3 className="font-heading text-xl mt-4 text-white">{title}</h3>
      <p className="text-white/65 text-sm mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const { firebaseUser } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuroraBackground intensity={1.1} />

      {/* Header */}
      <header className="sticky top-0 z-30 glass-faint border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white font-bold shadow-lg shadow-violet-500/40">V</div>
            <div>
              <div className="font-heading font-semibold text-white leading-none">VolunCore</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Smart Impact</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#impact" className="hover:text-white">Impact</a>
          </nav>
          <div className="flex items-center gap-2">
            {firebaseUser ? (
              <Button onClick={() => nav('/v')} data-testid="open-app-btn">Open App <ArrowRight size={16} /></Button>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" data-testid="header-signin">Sign in</Button></Link>
                <Link to="/auth?mode=signup"><Button data-testid="header-getstarted">Get started <ArrowRight size={16} /></Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-16 sm:pt-24 pb-16 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <Badge variant="violet" className="mb-6">
            <Sparkles size={12} /> Smart, AI-powered volunteering
          </Badge>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight font-light text-white">
            Smart resource allocation for <span className="text-gradient bg-gradient-anim font-semibold">data-driven</span> volunteer coordination.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-2xl leading-relaxed">
            VolunCore matches the right volunteer to the right cause at the right moment — analyzing skills, urgency, location, and live field reports to turn intent into measurable social impact.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth?mode=signup&role=volunteer"><Button size="lg" className="glow-violet" data-testid="hero-volunteer-cta">I'm a Volunteer <Heart size={16} /></Button></Link>
            <Link to="/auth?mode=signup&role=ngo"><Button size="lg" variant="secondary" data-testid="hero-ngo-cta">I run an NGO <Globe2 size={16} /></Button></Link>
          </div>
          <div className="mt-10 flex items-center gap-6">
            <div className="flex -space-x-3">
              {['from-violet-500 to-fuchsia-500','from-cyan-400 to-blue-500','from-pink-500 to-rose-500','from-amber-400 to-orange-500'].map((g,i)=>(
                <div key={i} className={`h-9 w-9 rounded-full bg-gradient-to-br ${g} ring-2 ring-[#0b0f1e]`} />
              ))}
            </div>
            <div className="text-sm text-white/60">Trusted by volunteers across <span className="text-white">42 cities</span></div>
          </div>
        </div>

        {/* Hero Card visual */}
        <div className="lg:col-span-5 relative">
          <div className="relative glass-strong rounded-3xl p-6 aurora-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest text-white/60">Live AI Match</span>
              </div>
              <Badge variant="cyan"><BrainCircuit size={10} /> Smart match</Badge>
            </div>
            <div className="space-y-3">
              {[
                { t: 'Flood relief — Chennai', s: 0.96, c: 'high', tag: 'Logistics' },
                { t: 'After-school tutoring — Mumbai', s: 0.88, c: 'medium', tag: 'Teaching' },
                { t: 'Food drive — Bengaluru', s: 0.81, c: 'high', tag: 'Coordination' },
              ].map((m, i) => (
                <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{m.t}</div>
                    <div className="flex gap-2 mt-1"><Badge variant="violet">{m.tag}</Badge><Badge variant={m.c==='high'?'rose':'amber'}>{m.c}</Badge></div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-2xl text-gradient">{Math.round(m.s*100)}%</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">match</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-white/50">
              <span>Sorted by skill + urgency + proximity</span>
              <span className="animate-pulse">analyzing…</span>
            </div>
          </div>
          {/* Floating chips */}
          <div className="hidden md:flex absolute -top-6 -left-6 glass rounded-full px-3 py-1.5 text-xs items-center gap-2 animate-float"><Zap size={12} className="text-amber-300" /> Crisis alert in 2.4s</div>
          <div className="hidden md:flex absolute -bottom-6 -right-6 glass rounded-full px-3 py-1.5 text-xs items-center gap-2 animate-float-slow"><MapPinned size={12} className="text-cyan-300" /> 12 NGOs nearby</div>
        </div>
      </section>

      {/* Stats */}
      <section id="impact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="glass rounded-3xl p-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat value="3.4k" label="Volunteers" />
          <Stat value="180+" label="NGO partners" />
          <Stat value="12k" label="Hours logged" />
          <Stat value="₹42L" label="Resources matched" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20">
        <div className="max-w-2xl mb-12">
          <Badge variant="cyan">Features</Badge>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mt-4 leading-tight">
            From signal to impact, <span className="text-gradient font-semibold">in seconds</span>.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature icon={BrainCircuit} title="AI Smart Matching" desc="Every open cause is scored against your skills, location and availability — so your time goes where it counts." color="bg-violet-500/40" />
          <Feature icon={Compass} title="Discover Causes" desc="Live feed of open causes across categories with rich filters and live urgency." color="bg-cyan-500/40" />
          <Feature icon={MapPinned} title="Multimodal Field Reports" desc="Send photo + voice + text from the field. Smart tagging surfaces urgency, needs and crises." color="bg-pink-500/40" />
          <Feature icon={ShieldCheck} title="Crisis Detection" desc="Emergencies in field reports are detected instantly and flagged to admins with rich context." color="bg-rose-500/40" />
          <Feature icon={BarChart3} title="Weekly Impact Story" desc="Your hours, donations, and reports turn into a beautifully written, shareable impact story." color="bg-emerald-500/40" />
          <Feature icon={Users} title="Coordinator Console" desc="NGOs post causes, manage volunteers, allocate donations & schedule events." color="bg-amber-500/40" />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-24">
        <div className="relative glass-strong rounded-3xl p-12 text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-50" style={{ background: 'radial-gradient(ellipse at center, hsl(263 88% 60% / .35), transparent 60%)' }} />
          <h3 className="font-heading text-3xl sm:text-5xl text-white">Ready to <span className="text-gradient">turn intent into impact</span>?</h3>
          <p className="mt-4 text-white/65 max-w-xl mx-auto">Join VolunCore and give your time where it counts most.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth?mode=signup"><Button size="lg" className="glow-violet">Start volunteering <ArrowRight size={16} /></Button></Link>
          </div>
        </div>
        <div className="text-center text-xs text-white/40 mt-10">© 2026 VolunCore — Built by Jeevika and Dhakshin.</div>
      </section>
    </div>
  );
}
