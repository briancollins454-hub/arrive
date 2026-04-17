import { Link } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, Zap, Shield, Users, CalendarClock, BarChart3, MessageSquareHeart, KeyRound, Building2 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-midnight font-display font-bold">A</div>
          <span className="text-xl font-display">Arrivé</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-body">
          <a href="#features" className="text-silver hover:text-white">Features</a>
          <a href="#pricing" className="text-silver hover:text-white">Pricing</a>
          <Link to="/book/grand-harbour" className="text-silver hover:text-white">Demo booking</Link>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-white/[0.1]">Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs uppercase tracking-widest mb-6">
          <Sparkles className="w-3 h-3" /> Built for independent hotels
        </div>
        <h1 className="text-5xl md:text-6xl font-display tracking-tight mb-5 leading-[1.05]">
          Hotel software that actually<br />
          <span className="text-gold">works like you do.</span>
        </h1>
        <p className="text-lg text-silver max-w-2xl mx-auto mb-8 font-body">
          A modern PMS, direct booking engine, and guest lifecycle toolkit for boutique and independent properties. Flat pricing from £149/mo. Zero commission on direct bookings. No bloat.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="px-6 py-3 rounded-lg bg-gold text-midnight font-semibold hover:bg-gold-light transition-colors flex items-center gap-2">
            Try the live demo <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#pricing" className="px-6 py-3 rounded-lg border border-white/15 hover:bg-white/[0.06] transition-colors">See pricing</a>
        </div>
        <p className="text-xs text-steel mt-5 font-body">One click demo access. No signup, no credit card.</p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-display mb-3">Everything you need. Nothing you don't.</h2>
          <p className="text-silver font-body max-w-xl mx-auto">The operational core of a £200/mo PMS, plus the guest-facing tools most of them charge extra for.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-base font-semibold mb-1.5 font-body">{f.title}</h3>
              <p className="text-sm text-silver font-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display mb-3">Honest, transparent pricing</h2>
          <p className="text-silver font-body">Flat monthly rate based on room count. No setup fees, no commission, no surprises. Cancel any time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl p-7 md:p-8 flex flex-col ${
                t.highlight
                  ? 'border-2 border-gold/50 bg-gradient-to-br from-gold/[0.1] via-white/[0.02] to-transparent relative'
                  : 'border border-white/10 bg-white/[0.03]'
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-midnight text-[10px] uppercase tracking-widest font-semibold">
                  Most popular
                </div>
              )}
              <div className="text-xs uppercase tracking-widest text-gold mb-2 font-body">{t.name}</div>
              <div className="text-sm text-steel font-body mb-4">{t.size}</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-4xl font-display text-white">£{t.price}</span>
                <span className="text-steel text-sm font-body">/ month</span>
              </div>
              <p className="text-xs text-silver font-body mb-6">{t.tagline}</p>

              <ul className="space-y-2 mb-7 flex-1">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm font-body">
                    <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                    <span className="text-silver">{b}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-colors ${
                  t.highlight
                    ? 'bg-gold text-midnight hover:bg-gold-light'
                    : 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]'
                }`}
              >
                Try the demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-steel font-body mb-8">
          Multi-property? 20% off each additional property. Annual billing? 2 months free.
          <br />
          Running a 10-room B&B or guesthouse? We've got you covered from <span className="text-silver">£79/mo</span> — <a href="mailto:brian@thesupportsdesk.com" className="text-gold hover:text-gold-light">get in touch</a>.
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 mb-8">
          <h3 className="text-sm uppercase tracking-widest text-gold mb-4 font-body">What every tier includes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm font-body">
                <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                <span className="text-silver">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI add-on */}
        <div className="rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/[0.08] via-white/[0.02] to-transparent p-6 md:p-8 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-[260px]">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[10px] uppercase tracking-widest mb-3 font-body">
                <Sparkles className="w-3 h-3" /> Optional add-on
              </div>
              <h3 className="text-2xl font-display text-white mb-2">Arrivé AI</h3>
              <p className="text-sm text-silver font-body mb-4 max-w-xl">
                Add a 24/7 operations co-pilot trained on your property. Generates daily revenue recommendations, spots anomalies, and lets you ask plain-English questions about your data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-body">
                {AI_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                    <span className="text-silver">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-3xl font-display text-white">+£40</span>
                <span className="text-steel text-sm font-body">/ month</span>
              </div>
              <p className="text-xs text-steel font-body mt-1">Fully managed. No API keys, no per-query fees.</p>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-sm uppercase tracking-widest text-steel mb-4 font-body">How we stack up (50-room property)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-body">
            <div><div className="text-steel text-xs mb-1">Cloudbeds</div><div className="text-white">~£270/mo + commission</div></div>
            <div><div className="text-steel text-xs mb-1">Mews</div><div className="text-white">~£300/mo + setup fees</div></div>
            <div><div className="text-steel text-xs mb-1">Little Hotelier</div><div className="text-white">~£200/mo, capped features</div></div>
            <div><div className="text-gold text-xs mb-1">Arrivé</div><div className="text-white font-semibold">£149/mo. Everything in.</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-display mb-3">See it running your property.</h2>
        <p className="text-silver font-body mb-7 max-w-lg mx-auto">Load the demo with real-looking data in one click. Poke around. No signup required.</p>
        <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gold text-midnight font-semibold hover:bg-gold-light transition-colors">
          Open live demo <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-steel font-body">
          <span>© {new Date().getFullYear()} Arrivé. Built for hoteliers who've had enough.</span>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-white">Sign in</Link>
            <a href="mailto:brian@thesupportsdesk.com" className="hover:text-white">brian@thesupportsdesk.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Sparkles, title: 'Arrivé AI (optional +£40/mo)', body: 'Plain-English data queries, daily revenue suggestions, anomaly detection, and draft replies to guests. Fully managed — no setup.' },
  { icon: CalendarClock, title: 'Smart booking engine', body: 'Direct bookings, zero commission, instant confirmation. Branded to your property.' },
  { icon: KeyRound, title: 'Online self check-in', body: 'Guests check in from the pre-arrival email. Reception gets arrival ETA, ID, and requests in advance.' },
  { icon: MessageSquareHeart, title: 'Guest lifecycle emails', body: 'Pre-arrival info, post-stay review requests, and marketing to past guests — all in one place.' },
  { icon: Users, title: 'Guest memory', body: 'Preferences and history follow the guest across bookings. Surface returning-guest details automatically.' },
  { icon: BarChart3, title: 'Financials that export', body: 'Folios, city ledger, Stripe payments. One-click exports to Xero and QuickBooks.' },
  { icon: Zap, title: 'Fast, modern, delightful', body: 'Keyboard shortcuts, instant search, offline install. Built this decade.' },
  { icon: Shield, title: 'Your data, your keys', body: 'Self-hosted Stripe & email keys per property. We never touch your guests\' payments.' },
  { icon: Building2, title: 'Multi-property ready', body: 'Switch between hotels in a click. Staff roles and rates are per-property.' },
  { icon: Check, title: 'No hidden fees', body: 'Flat monthly rate. No per-booking fees, no commission, no "enterprise tier" upsell.' },
];

const TIERS = [
  {
    name: 'Boutique',
    size: '11–50 rooms',
    price: 149,
    tagline: 'Perfect for small independent hotels and larger guesthouses.',
    highlight: false,
    bullets: [
      'Unlimited bookings & guests',
      'Direct booking engine',
      'Online self check-in',
      'Guest lifecycle emails',
      'Xero / QuickBooks exports',
      'Email support',
    ],
  },
  {
    name: 'Independent',
    size: '51–100 rooms',
    price: 249,
    tagline: 'For mid-size independents that need the full operational suite.',
    highlight: true,
    bullets: [
      'Everything in Boutique',
      'Multi-property ready (20% off extras)',
      'Night audit & financial dashboard',
      'Channel manager integration',
      'Staff rota & permissions',
      'Priority support',
    ],
  },
  {
    name: 'Portfolio',
    size: '100+ rooms',
    price: 349,
    tagline: 'Larger properties and small groups. +£2 / room over 150.',
    highlight: false,
    bullets: [
      'Everything in Independent',
      'Group / corporate bookings',
      'City ledger & invoicing',
      'Advanced rate intelligence',
      'Dedicated onboarding',
      'Phone & Slack support',
    ],
  },
];

const AI_FEATURES = [
  'Daily revenue & pricing suggestions',
  'Natural-language data queries ("show me last weekend\'s ADR")',
  'Anomaly detection (booking spikes, cancellations, rate issues)',
  'Returning-guest intelligence at check-in',
  'Draft replies to guest messages & reviews',
  'Forecasting & rate intelligence',
];

const INCLUDED = [
  'Unlimited bookings & guests',
  'Direct booking engine (your own URL)',
  'Online self check-in',
  'Housekeeping & room assignment',
  'Folios, payments & city ledger',
  'Rate periods & packages',
  'Guest lifecycle emails',
  'Xero / QuickBooks CSV export',
  'Staff roles & permissions',
  'Mobile install (PWA)',
  'Email support',
  'All future features included',
];
