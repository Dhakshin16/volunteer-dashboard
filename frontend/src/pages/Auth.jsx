import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Label } from '@/components/ui/primitives';
import { Dialog, toast } from '@/components/ui/dialog';
import AuroraBackground from '@/components/AuroraBackground';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Mail, Lock, User, Sparkles } from 'lucide-react';

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 16.4 4 9.8 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.8-5.3l-6.4-5.4C29.4 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.4 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.4 5.4C40 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'login';
  const initialRoleHint = params.get('role'); // optional, just used for greeting
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { loginEmail, signupEmail, loginGoogle, resetPassword, firebaseUser } = useAuth();
  const nav = useNavigate();

  useEffect(() => { if (firebaseUser) nav('/'); }, [firebaseUser, nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginEmail(email, pwd);
        toast.success('Welcome back!');
      } else {
        await signupEmail(email, pwd, name);
        toast.success('Account created!');
      }
    } catch (e) {
      toast.error(e.message || 'Authentication failed');
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await loginGoogle();
      toast.success('Signed in with Google');
    } catch (e) {
      toast.error(e.message || 'Google sign-in failed');
    } finally { setBusy(false); }
  };

  const onReset = async () => {
    if (!resetEmail) return;
    try { await resetPassword(resetEmail); toast.success('Reset email sent'); setShowReset(false); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <AuroraBackground intensity={1.2} />

      {/* Left visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative">
        <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft size={16} /> Back home
        </Link>
        <div>
          <h2 className="font-heading text-5xl text-white leading-tight">
            Where your <span className="text-gradient">time</span> meets the world's <span className="text-gradient">need</span>.
          </h2>
          <p className="text-white/65 mt-4 max-w-md">VolunCore uses Google Gemini to match volunteers with the right cause at the right moment, so your effort moves the needle—measurably.</p>
          <div className="mt-8 flex gap-3">
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-white/70"><Sparkles size={12} /> Gemini 2.5</div>
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-white/70">Firestore</div>
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-white/70">Firebase Auth</div>
          </div>
        </div>
        <div className="text-xs text-white/40">By continuing you agree to our Terms and Privacy.</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12 min-h-screen">
        <Card className="w-full max-w-md glass-strong aurora-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white font-bold">V</div>
            <div>
              <div className="font-heading text-xl text-white">{mode === 'login' ? 'Welcome back' : 'Create your account'}</div>
              <div className="text-xs text-white/50">{initialRoleHint ? `Joining as a ${initialRoleHint}` : 'Sign in to continue your impact journey'}</div>
            </div>
          </div>

          <Button variant="secondary" className="w-full mt-6" onClick={onGoogle} disabled={busy} data-testid="auth-google-btn">
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-widest text-white/40">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name">Name</Label>
                <div className="relative mt-1">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="pl-10" required data-testid="auth-name" />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" required data-testid="auth-email" />
              </div>
            </div>
            <div>
              <Label htmlFor="pwd">Password</Label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" className="pl-10" minLength={6} required data-testid="auth-password" />
              </div>
            </div>
            {mode === 'login' && (
              <button type="button" onClick={() => { setResetEmail(email); setShowReset(true); }} className="text-xs text-cyan-300 hover:underline">
                Forgot password?
              </button>
            )}
            <Button type="submit" className="w-full mt-2" disabled={busy} data-testid="auth-submit">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="text-center text-sm text-white/60 mt-5">
            {mode === 'login' ? (
              <>New here? <button onClick={() => setMode('signup')} className="text-cyan-300 hover:underline" data-testid="auth-switch-signup">Create an account</button></>
            ) : (
              <>Already have one? <button onClick={() => setMode('login')} className="text-cyan-300 hover:underline" data-testid="auth-switch-login">Sign in</button></>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={showReset} onClose={() => setShowReset(false)} title="Reset password" maxWidth="max-w-md">
        <Label>Email</Label>
        <Input className="mt-1" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => setShowReset(false)}>Cancel</Button>
          <Button onClick={onReset}>Send link</Button>
        </div>
      </Dialog>
    </div>
  );
}
