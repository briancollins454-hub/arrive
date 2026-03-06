import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isDemoMode } from '@/lib/supabase';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Lock, Mail, AlertCircle, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface InviteInfo {
  name: string;
  email: string;
  role: string;
  property_name?: string;
  expires_at: string;
}

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch invite details on mount
  useEffect(() => {
    if (!token || isDemoMode) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    async function fetchInvite() {
      const { data, error: err } = await supabase
        .from('staff_invites')
        .select('name, email, role, expires_at, property:properties(name)')
        .eq('token', token!)
        .eq('status', 'pending')
        .single();

      if (err || !data) {
        setError('This invite link is invalid, expired, or has already been used.');
        setLoading(false);
        return;
      }

      // Check expiry
      if (new Date(data.expires_at) < new Date()) {
        setError('This invite has expired. Ask your hotel administrator to send a new one.');
        setLoading(false);
        return;
      }

      const propertyData = data.property as unknown as { name: string } | { name: string }[] | null;
      const propertyName = Array.isArray(propertyData) ? propertyData[0]?.name : propertyData?.name;

      setInvite({
        name: data.name,
        email: data.email,
        role: data.role,
        property_name: propertyName ?? undefined,
        expires_at: data.expires_at,
      });
      setLoading(false);
    }

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!invite || !token) return;

    setSubmitting(true);

    try {
      // 1. Sign up the new user with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: { name: invite.name, invite_token: token },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        // If user already exists, try to sign in instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password,
          });
          if (signInError) {
            setError('An account with this email already exists. Please sign in at the login page.');
            setSubmitting(false);
            return;
          }
          // User signed in — accept the invite
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            await supabase.rpc('accept_invite', {
              invite_token: token,
              new_user_id: user.id,
            });
          }
          setDone(true);
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }
        throw signUpError;
      }

      // 2. Accept the invite — creates staff_members row via DB function
      const userId = signUpData.user?.id;
      if (userId) {
        const { data: result } = await supabase.rpc('accept_invite', {
          invite_token: token,
          new_user_id: userId,
        });

        if (result && !result.success) {
          setError(result.error || 'Failed to accept invite');
          setSubmitting(false);
          return;
        }
      }

      // Check if email confirmation is needed (no session returned)
      const hasSession = !!signUpData.session;

      setDone(true);
      if (hasSession) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
      // If no session, user needs to confirm email first — the done state will show a message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  /** Whether signup completed but email confirmation is required */
  const needsEmailConfirmation = done && !submitting;

  const roleLabel = (role: string) =>
    role.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden flex items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px] animate-aurora" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal/[0.04] rounded-full blur-[100px] animate-aurora-2" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="dark" size="lg" />
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-panel p-8 border border-white/[0.08] text-center">
            <Loader2 size={32} className="animate-spin text-gold mx-auto mb-4" />
            <p className="text-silver font-body">Verifying invite…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && !invite && (
          <div className="glass-panel p-8 border border-white/[0.08] text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-display text-white mb-2">Invalid Invite</h2>
            <p className="text-sm text-steel font-body mb-6">{error}</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        )}

        {/* Success — account created */}
        {done && (
          <div className="glass-panel p-8 border border-white/[0.08] text-center animate-in fade-in duration-300">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-display text-white mb-2">You're All Set!</h2>
            <p className="text-sm text-steel font-body mb-4">
              Your account has been created.
            </p>
            {needsEmailConfirmation && (
              <p className="text-sm text-gold font-body">
                Check your email for a confirmation link, then{' '}
                <button onClick={() => navigate('/login')} className="underline hover:text-gold/80 transition-colors">
                  sign in here
                </button>.
              </p>
            )}
            {!needsEmailConfirmation && (
              <p className="text-sm text-steel font-body">Redirecting to dashboard…</p>
            )}
          </div>
        )}

        {/* Invite form */}
        {!loading && invite && !done && (
          <div className="glass-panel p-8 border border-white/[0.08]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-display text-white mb-1.5">You're Invited</h2>
              {invite.property_name && (
                <p className="text-sm text-gold font-body font-medium">{invite.property_name}</p>
              )}
              <p className="text-sm text-steel font-body mt-1">
                Create your account to get started as <span className="text-silver font-medium">{roleLabel(invite.role)}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pre-filled name */}
              <div>
                <Label variant="dark">Name</Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                  <Input variant="dark" value={invite.name} disabled className="pl-9 opacity-60" />
                </div>
              </div>

              {/* Pre-filled email */}
              <div>
                <Label variant="dark">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                  <Input variant="dark" type="email" value={invite.email} disabled className="pl-9 opacity-60" />
                </div>
              </div>

              {/* Password */}
              <div>
                <Label variant="dark">Create Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                  <Input
                    variant="dark"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label variant="dark">Confirm Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                  <Input
                    variant="dark"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating Account…' : 'Create Account & Sign In'}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] text-steel/40 font-body">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-gold hover:text-gold/80 transition-colors">
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
