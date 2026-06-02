import { useState } from 'react';
import { supabase, isDemoMode, isPlatformAdmin } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Building2, Plus, Users, CheckCircle2, Copy, Loader2,
  MapPin, Phone, Globe, Mail, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NewProperty {
  name: string;
  slug: string;
  description: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
}

interface OwnerInvite {
  name: string;
  email: string;
}

const emptyProperty: NewProperty = {
  name: '', slug: '', description: '',
  address_line1: '', address_line2: '', city: '', county: '', postcode: '', country: 'United Kingdom',
  phone: '', email: '', website: '',
};

export function AdminPage() {
  const user = useAppStore((s) => s.user);
  const [step, setStep] = useState<'form' | 'invite' | 'done'>('form');
  const [isSending, setIsSending] = useState(false);
  const [prop, setProp] = useState<NewProperty>(emptyProperty);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [owner, setOwner] = useState<OwnerInvite>({ name: '', email: '' });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  // Only the platform admin can access this page
  if (!isPlatformAdmin(user?.email)) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Building2 size={48} className="text-steel mx-auto mb-4" />
          <h2 className="text-xl font-display text-white mb-2">Access Restricted</h2>
          <p className="text-steel font-body text-sm">Only the platform administrator can onboard new hotels.</p>
        </div>
      </div>
    );
  }

  const handleSlugify = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleContinueToOwner = () => {
    if (!prop.name.trim()) { toast.error('Hotel name is required'); return; }
    if (!prop.slug.trim()) { toast.error('URL slug is required'); return; }
    if (!/^[a-z0-9-]+$/.test(prop.slug.trim())) {
      toast.error('Slug may only contain lowercase letters, numbers and hyphens');
      return;
    }
    setStep('invite');
  };

  const handleOnboard = async () => {
    if (!owner.name.trim() || !owner.email.trim()) { toast.error('Owner name and email are required'); return; }

    setIsSending(true);
    try {
      if (isDemoMode) {
        setCreatedPropertyId(`demo-${Date.now()}`);
        setInviteLink(`${window.location.origin}/invite/demo-token-123`);
        setEmailSent(true);
        setStep('done');
        toast.success('Hotel onboarded (demo mode)');
        setIsSending(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('onboard-hotel', {
        body: {
          name: prop.name.trim(),
          slug: prop.slug.trim().toLowerCase(),
          description: prop.description.trim(),
          address: {
            line1: prop.address_line1, line2: prop.address_line2,
            city: prop.city, county: prop.county,
            postcode: prop.postcode, country: prop.country,
          },
          contact: { phone: prop.phone, email: prop.email, website: prop.website },
          owner: { name: owner.name.trim(), email: owner.email.trim() },
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setCreatedPropertyId(data.property_id);
      setInviteLink(data.invite_url);
      setEmailSent(!!data.email_sent);
      setStep('done');

      if (data.email_sent) {
        toast.success(`"${prop.name}" onboarded — setup email sent to ${owner.email.trim()}`);
      } else {
        toast.success(`"${prop.name}" onboarded`);
        toast.error(`Email could not be sent (${data.email_error ?? 'unknown'}). Share the link manually.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to onboard hotel';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied');
    }
  };

  const handleReset = () => {
    setProp(emptyProperty);
    setOwner({ name: '', email: '' });
    setCreatedPropertyId(null);
    setInviteLink(null);
    setEmailSent(false);
    setStep('form');
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Onboard New Hotel</h1>
        <p className="text-sm text-steel font-body">Create a new property and send an owner invite</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: 'Property Details', active: step === 'form' },
          { num: 2, label: 'Owner Invite', active: step === 'invite' },
          { num: 3, label: 'Done', active: step === 'done' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3 flex-1">
            <div className={`flex items-center gap-2 ${s.active ? 'text-gold' : step === 'done' || (step === 'invite' && s.num === 1) ? 'text-emerald-400' : 'text-steel/40'}`}>
              {(step === 'done' || (step === 'invite' && s.num === 1)) ? (
                <CheckCircle2 size={20} />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${s.active ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-steel/40'}`}>
                  {s.num}
                </div>
              )}
              <span className="text-xs font-body font-semibold hidden sm:block">{s.label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-white/[0.06]" />}
          </div>
        ))}
      </div>

      {/* Step 1: Property Details */}
      {step === 'form' && (
        <Card variant="dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 size={18} className="text-gold" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label variant="dark">Hotel Name *</Label>
                <Input
                  variant="dark"
                  placeholder="The Harbour Hotel"
                  value={prop.name}
                  onChange={(e) => {
                    setProp({ ...prop, name: e.target.value, slug: handleSlugify(e.target.value) });
                  }}
                />
              </div>
              <div>
                <Label variant="dark">URL Slug *</Label>
                <Input
                  variant="dark"
                  placeholder="harbour-hotel"
                  value={prop.slug}
                  onChange={(e) => setProp({ ...prop, slug: e.target.value })}
                />
                <p className="text-[10px] text-steel mt-1 font-body">Used in booking URL: /book/{prop.slug || 'slug'}</p>
              </div>
            </div>

            <div>
              <Label variant="dark">Description</Label>
              <Textarea
                variant="dark"
                rows={2}
                placeholder="Brief description of the hotel"
                value={prop.description}
                onChange={(e) => setProp({ ...prop, description: e.target.value })}
              />
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="text-xs font-body font-semibold text-silver uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input variant="dark" placeholder="Address Line 1" value={prop.address_line1} onChange={(e) => setProp({ ...prop, address_line1: e.target.value })} />
                <Input variant="dark" placeholder="Address Line 2" value={prop.address_line2} onChange={(e) => setProp({ ...prop, address_line2: e.target.value })} />
                <Input variant="dark" placeholder="City" value={prop.city} onChange={(e) => setProp({ ...prop, city: e.target.value })} />
                <Input variant="dark" placeholder="County" value={prop.county} onChange={(e) => setProp({ ...prop, county: e.target.value })} />
                <Input variant="dark" placeholder="Postcode" value={prop.postcode} onChange={(e) => setProp({ ...prop, postcode: e.target.value })} />
                <Input variant="dark" placeholder="Country" value={prop.country} onChange={(e) => setProp({ ...prop, country: e.target.value })} />
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="text-xs font-body font-semibold text-silver uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Phone size={12} /> Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label variant="dark" className="flex items-center gap-1"><Phone size={10} /> Phone</Label>
                  <Input variant="dark" placeholder="+44 1234 567890" value={prop.phone} onChange={(e) => setProp({ ...prop, phone: e.target.value })} />
                </div>
                <div>
                  <Label variant="dark" className="flex items-center gap-1"><Mail size={10} /> Email</Label>
                  <Input variant="dark" placeholder="info@hotel.com" value={prop.email} onChange={(e) => setProp({ ...prop, email: e.target.value })} />
                </div>
                <div>
                  <Label variant="dark" className="flex items-center gap-1"><Globe size={10} /> Website</Label>
                  <Input variant="dark" placeholder="https://hotel.com" value={prop.website} onChange={(e) => setProp({ ...prop, website: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleContinueToOwner}>
                Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Owner Invite */}
      {step === 'invite' && (
        <Card variant="dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users size={18} className="text-teal" />
              Send Owner Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-sm text-silver font-body flex items-center gap-2">
                <Building2 size={14} className="text-gold" />
                <strong className="text-white">{prop.name}</strong>
                <span className="text-steel">· /book/{prop.slug}</span>
              </p>
            </div>
            <p className="text-sm text-steel font-body">
              Enter the hotel owner's details. We'll create the hotel and email them a secure link to set their password and start configuring it (room types, rooms, rates, staff).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label variant="dark">Owner Name *</Label>
                <Input variant="dark" placeholder="John Smith" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} />
              </div>
              <div>
                <Label variant="dark">Owner Email *</Label>
                <Input variant="dark" type="email" placeholder="john@hotel.com" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost-dark" onClick={() => setStep('form')} disabled={isSending}>
                Back
              </Button>
              <Button onClick={handleOnboard} disabled={isSending}>
                {isSending ? <><Loader2 size={16} className="animate-spin mr-2" /> Onboarding...</> : <><CheckCircle2 size={16} className="mr-2" /> Onboard Hotel & Send Invite</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <Card variant="dark">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              Hotel Onboarded
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
              <p className="text-sm text-silver font-body"><strong className="text-white">Hotel:</strong> {prop.name}</p>
              <p className="text-sm text-silver font-body"><strong className="text-white">Booking URL:</strong> /book/{prop.slug}</p>
              {createdPropertyId && (
                <p className="text-sm text-silver font-body"><strong className="text-white">Property ID:</strong> <code className="text-[11px] text-steel bg-white/[0.05] px-1.5 py-0.5 rounded">{createdPropertyId}</code></p>
              )}
            </div>

            <div className={`p-3 rounded-lg border ${emailSent ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
              <p className={`text-sm font-body flex items-center gap-2 ${emailSent ? 'text-emerald-400' : 'text-amber-400'}`}>
                {emailSent ? <CheckCircle2 size={14} /> : <Mail size={14} />}
                {emailSent
                  ? <span>Setup email sent to <strong>{owner.email}</strong></span>
                  : <span>Email could not be sent automatically — share the link below with the owner.</span>}
              </p>
            </div>

            {inviteLink && (
              <div className="space-y-2">
                <p className="text-sm text-silver font-body"><strong className="text-white">Owner Invite:</strong> {owner.name} ({owner.email})</p>
                <div className="flex items-center gap-2">
                  <Input variant="dark" readOnly value={inviteLink} className="text-xs font-mono" />
                  <Button variant="outline-dark" size="icon" onClick={handleCopyLink}>
                    <Copy size={14} />
                  </Button>
                </div>
                <p className="text-[10px] text-steel font-body">This secure link expires in 7 days.</p>
              </div>
            )}

            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="text-xs font-body font-semibold text-silver uppercase tracking-wider mb-2">What the owner does next:</h3>
              <ol className="text-sm text-steel font-body space-y-1 list-decimal list-inside">
                <li>Click the invite link and set their password</li>
                <li>Go to <strong className="text-silver">Rooms</strong> → create room types and add rooms</li>
                <li>Go to <strong className="text-silver">Rates</strong> → set seasonal pricing</li>
                <li>Go to <strong className="text-silver">Settings</strong> → invite their staff</li>
                <li>Contact you for channel manager API setup & key card integration</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleReset}>
                <Plus size={16} className="mr-2" /> Onboard Another Hotel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
