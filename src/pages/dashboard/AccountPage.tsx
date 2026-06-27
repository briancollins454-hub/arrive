import { useState } from 'react';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Mail, Shield, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/shared/PageShell';
import toast from 'react-hot-toast';

export function AccountPage() {
  const user = useAppStore((s) => s.user);
  const staff = useAppStore((s) => s.staff);
  const { roleLabel } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    if (isDemoMode) { setError('Password changes are unavailable in demo mode.'); return; }
    if (password.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('New passwords do not match'); return; }
    if (!user?.email) { setError('No active session. Please sign in again.'); return; }

    setSubmitting(true);
    try {
      // Re-authenticate with the current password before allowing a change.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        setError('Your current password is incorrect.');
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className="max-w-2xl">
      <PageHeader
        title="My Account"
        description="Manage your profile and password"
        variant="dark"
      />

      <Card variant="dark" className="mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User size={18} className="text-gold" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm font-body">
            <User size={15} className="text-steel" />
            <span className="text-steel w-24">Name</span>
            <span className="text-white">{staff?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-body">
            <Mail size={15} className="text-steel" />
            <span className="text-steel w-24">Email</span>
            <span className="text-white">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-body">
            <Shield size={15} className="text-steel" />
            <span className="text-steel w-24">Role</span>
            <span className="text-white">{roleLabel}</span>
          </div>
        </CardContent>
      </Card>

      <Card variant="dark">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock size={18} className="text-teal" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label variant="dark">Current Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                <Input
                  variant="dark"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label variant="dark">New Password</Label>
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
            </div>

            <div>
              <Label variant="dark">Confirm New Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                <Input
                  variant="dark"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              {submitting ? 'Updating…' : <><CheckCircle2 size={16} className="mr-2" /> Update Password</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
