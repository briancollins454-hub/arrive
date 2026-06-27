import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isDemoMode } from '@/lib/supabase';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Lock, AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid' | 'done'>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery can arrive as:
  // 1) ?token_hash=...&type=recovery (custom Resend email — preferred)
  // 2) #access_token=... (Supabase verify redirect — legacy)
  useEffect(() => {
    if (isDemoMode) { setStatus('invalid'); return; }

    let resolved = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearRecoveryQuery = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('token_hash');
      url.searchParams.delete('type');
      const qs = url.searchParams.toString();
      window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || resolved) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        resolved = true;
        setStatus('ready');
      }
    });

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      if (params.get('type') === 'recovery' && tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        clearRecoveryQuery();
        if (cancelled) return;
        resolved = true;
        setStatus(error ? 'invalid' : 'ready');
        if (error) console.warn('[Arrivé] recovery verifyOtp:', error.message);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || resolved) return;
      if (session) {
        resolved = true;
        setStatus('ready');
      }
    }

    init();

    timer = setTimeout(() => {
      if (!cancelled && !resolved) setStatus((s) => (s === 'verifying' ? 'invalid' : s));
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const passwordScore = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['Too short', 'Weak', 'Good', 'Strong'][password.length === 0 ? 0 : passwordScore];
  const strengthColor = ['bg-steel/30', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400'][password.length === 0 ? 0 : passwordScore];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setStatus('done');
      // Sign out so they log in fresh with the new password.
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="dark" size="lg" />
        </div>

        <div className="glass-panel p-8 border border-white/[0.08]">
          {status === 'verifying' && (
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-gold mx-auto mb-4" />
              <p className="text-silver font-body">Verifying your reset link…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <XCircle size={40} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-display text-white mb-2">Link Expired or Invalid</h2>
              <p className="text-sm text-steel font-body mb-6">
                This password reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Button className="w-full" onClick={() => navigate('/forgot-password')}>Request New Link</Button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-display text-white mb-2">Password Updated</h2>
              <p className="text-sm text-steel font-body">Redirecting you to sign in…</p>
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display text-white mb-1.5">Set a New Password</h2>
                <p className="text-sm text-steel font-body">Choose a strong password for your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="New Password" variant="dark">
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                    <Input
                      variant="dark"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={8}
                    />
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(passwordScore / 3) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-steel font-body w-16 text-right">{strengthLabel}</span>
                    </div>
                  )}
                </FormField>

                <FormField label="Confirm Password" variant="dark">
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                    <Input
                      variant="dark"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={8}
                    />
                  </div>
                </FormField>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Updating…' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
