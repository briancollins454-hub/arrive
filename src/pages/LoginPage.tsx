import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Lock, Mail, AlertCircle, ArrowRight, BedDouble, BarChart3, MessageSquare, Shield } from 'lucide-react';

const FEATURES = [
  { icon: BedDouble, title: 'Room Management', desc: 'Real-time room status, types, and availability' },
  { icon: BarChart3, title: 'Revenue Insights', desc: 'Track occupancy and revenue at a glance' },
  { icon: MessageSquare, title: 'Guest Messaging', desc: 'Automated emails and SMS templates' },
  { icon: Shield, title: 'Direct Bookings', desc: 'Commission-free booking engine' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message || 'Invalid email or password');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Animated aurora orbs */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px] animate-aurora" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal/[0.04] rounded-full blur-[100px] animate-aurora-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/[0.02] rounded-full blur-[140px]" />

      <div className="relative z-10 min-h-screen flex">
        {/* Left side — branding & features */}
        <div className={`hidden lg:flex flex-col justify-between flex-1 p-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
          <div>
            <Logo variant="dark" size="lg" showTagline />
          </div>

          <div className="space-y-8 max-w-md">
            <div>
              <h1 className="text-5xl font-display text-white leading-tight mb-4">
                The all-in-one platform for
                <br />
                <span className="gradient-text">boutique hotels</span>
              </h1>
              <p className="text-silver/60 font-body text-sm leading-relaxed max-w-sm">
                Manage bookings, guests, rooms, and revenue — all from a single beautiful dashboard. No commissions. No complexity.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="glass-panel p-4 opacity-0 animate-slide-up"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <f.icon size={18} className="text-gold mb-2" />
                  <p className="text-xs font-semibold text-white font-body mb-0.5">{f.title}</p>
                  <p className="text-[11px] text-steel font-body">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-steel/40 font-body">
            © 2026 The Supports Desk · Built with care for independent hoteliers
          </p>
        </div>

        {/* Right side — login form */}
        <div className={`w-full lg:w-[480px] flex items-center justify-center p-6 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex justify-center mb-8">
              <Logo variant="dark" size="lg" />
            </div>

            <div className="glass-panel p-8 border border-white/[0.08] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display text-white mb-1.5">Welcome Back</h2>
                <p className="text-sm text-steel font-body">Sign in to your dashboard</p>
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

                <div>
                  <Label variant="dark">Password</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
                    <Input
                      variant="dark"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[11px] text-steel font-body bg-charcoal/80 rounded">or</span>
                </div>
              </div>

              <button
                onClick={handleDemoAccess}
                className="w-full group flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm font-body border border-gold/20 bg-gradient-to-r from-gold/[0.08] to-gold/[0.04] text-gold hover:from-gold/[0.15] hover:to-gold/[0.08] hover:border-gold/30 hover:shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300">
                Explore Demo
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <p className="mt-5 text-center text-[11px] text-steel/40 font-body tracking-wide">
                Demo mode — full access, no sign-up required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
