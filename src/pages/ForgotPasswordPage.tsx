import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isDemoMode } from '@/lib/supabase';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendReset = async () => {
    if (isDemoMode) {
      setError('Password reset is unavailable in demo mode.');
      return;
    }
    setIsLoading(true);
    try {
      // Branded reset email via send-password-reset (Resend). Never use
      // supabase.auth.resetPasswordForEmail — that sends Supabase's template.
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) {
        console.warn('[Arrivé] reset invoke error:', error);
        setError('Could not send reset email. Please try again in a moment.');
        return;
      }
      if (data?.error) {
        setError(String(data.error));
        return;
      }
      setSent(true);
      setCooldown(30);
      toast.success('If that email is registered, a reset link is on its way.');
    } catch (err) {
      console.warn('[Arrivé] reset invoke error:', err);
      setError('Could not send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await sendReset();
  };

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px] animate-aurora" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal/[0.04] rounded-full blur-[100px] animate-aurora-2" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="dark" size="lg" />
        </div>

        <div className="glass-panel p-8 border border-white/[0.08]">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-display text-white mb-2">Check Your Email</h2>
              <p className="text-sm text-steel font-body mb-6">
                If an account exists for <span className="text-silver">{email}</span>, you'll receive a link to reset your password shortly. The link expires in 1 hour.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>Back to Sign In</Button>
              <button
                onClick={sendReset}
                disabled={cooldown > 0 || isLoading}
                className="mt-3 w-full text-xs text-steel hover:text-silver disabled:opacity-50 disabled:hover:text-steel font-body transition-colors"
              >
                {isLoading ? 'Resending…' : cooldown > 0 ? `Resend link in ${cooldown}s` : "Didn't get it? Resend link"}
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display gradient-text-vibrant mb-1.5">Forgot Password?</h2>
                <p className="text-sm text-steel font-body">Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label variant="dark">Email</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                    <Input
                      variant="dark"
                      type="email"
                      placeholder="you@hotel.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full flex items-center justify-center gap-1.5 text-xs text-steel hover:text-silver font-body transition-colors"
              >
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
