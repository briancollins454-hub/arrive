import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { GuestCommunication, GuestCommKind, Booking, Guest, Property } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// useGuestCommunications
// ============================================================
// Tracks pre-arrival / post-stay / marketing / self-check-in emails.
// Sends via the send-email edge function (Resend).
// ============================================================

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  kind: GuestCommKind;
  booking_id?: string;
  guest_id?: string;
  from_name?: string;
}

export function useGuestCommunications() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['guest-communications', propertyId],
    queryFn: async (): Promise<GuestCommunication[]> => {
      if (isDemoMode) {
        return queryClient.getQueryData<GuestCommunication[]>(['guest-communications', propertyId]) ?? [];
      }
      const { data, error } = await supabase
        .from('guest_communications')
        .select('*')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as GuestCommunication[];
    },
    enabled: !!propertyId,
  });

  const sendEmail = useMutation({
    mutationFn: async (input: SendEmailInput) => {
      if (isDemoMode) {
        const row: GuestCommunication = {
          id: `gc-${Date.now()}`,
          property_id: propertyId!,
          booking_id: input.booking_id ?? null,
          guest_id: input.guest_id ?? null,
          kind: input.kind,
          channel: 'email',
          status: 'sent',
          to_email: input.to,
          subject: input.subject,
          body: input.html,
          error: null,
          sent_at: new Date().toISOString(),
          scheduled_for: null,
          created_by: null,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<GuestCommunication[]>(
          ['guest-communications', propertyId],
          (old) => [row, ...(old ?? [])],
        );
        toast.success('Email sent (demo)');
        return row;
      }

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          property_id: propertyId,
          to: input.to,
          subject: input.subject,
          html: input.html,
          from_name: input.from_name,
          kind: input.kind,
          booking_id: input.booking_id,
          guest_id: input.guest_id,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Email sent');
      return data;
    },
    onSuccess: () => {
      if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['guest-communications', propertyId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send email'),
  });

  return {
    communications: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    sendEmail,
  };
}

// ============================================================
// Email template builders
// ============================================================

function wrapBranding(property: Property | undefined | null, inner: string): string {
  const name = property?.name ?? 'Your Hotel';
  const accentGold = '#c9a84c';
  const navy = '#0a0e1a';
  const phone = property?.contact?.phone ?? '';
  const email = property?.contact?.email ?? '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a2e;line-height:1.55;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <tr><td style="padding:28px 32px;background:${navy};text-align:center;">
        <div style="color:${accentGold};letter-spacing:4px;font-size:14px;font-weight:700;">${escapeHtml(name.toUpperCase())}</div>
      </td></tr>
      <tr><td style="padding:36px 32px;">${inner}</td></tr>
      <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center;">
        ${phone ? `<div>${escapeHtml(phone)}${email ? ' · ' : ''}${escapeHtml(email)}</div>` : email ? `<div>${escapeHtml(email)}</div>` : ''}
        <div style="margin-top:8px;color:#94a3b8;">Powered by <span style="color:${accentGold};letter-spacing:2px;">ARRIVÉ</span></div>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface TemplateContext {
  property?: Property | null;
  booking?: Booking | null;
  guest?: Guest | null;
  checkinUrl?: string;
  reviewUrl?: string;
  unsubscribeUrl?: string;
}

export function buildPreArrivalEmail(ctx: TemplateContext): { subject: string; html: string } {
  const firstName = ctx.guest?.first_name ?? 'there';
  const propName = ctx.property?.name ?? 'our hotel';
  const checkIn = ctx.booking?.check_in ? new Date(ctx.booking.check_in).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const checkInTime = ctx.property?.settings?.check_in_time ?? '15:00';
  const conf = ctx.booking?.confirmation_code ?? '';

  const inner = `
    <h2 style="font-size:22px;margin:0 0 16px 0;color:#0a0e1a;">We're looking forward to welcoming you, ${escapeHtml(firstName)}</h2>
    <p style="margin:0 0 16px 0;">Your stay at <strong>${escapeHtml(propName)}</strong> is coming up${checkIn ? ` on <strong>${escapeHtml(checkIn)}</strong>` : ''}.</p>
    <div style="background:#f8fafc;border-left:3px solid #c9a84c;padding:16px 20px;margin:20px 0;border-radius:4px;">
      <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Your booking</div>
      ${conf ? `<div><strong>Confirmation:</strong> ${escapeHtml(conf)}</div>` : ''}
      ${checkIn ? `<div><strong>Arrival:</strong> ${escapeHtml(checkIn)} from ${escapeHtml(checkInTime)}</div>` : ''}
    </div>
    <p style="margin:0 0 16px 0;">To make your arrival as smooth as possible, please complete online check-in:</p>
    ${ctx.checkinUrl ? `<p style="text-align:center;margin:28px 0;"><a href="${ctx.checkinUrl}" style="display:inline-block;background:#c9a84c;color:#0a0e1a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;letter-spacing:0.5px;">Complete check-in</a></p>` : ''}
    <p style="margin:0 0 8px 0;">If you have any special requests or questions ahead of your stay, simply reply to this email — we're here to help.</p>
    <p style="margin:24px 0 0 0;">We can't wait to welcome you.</p>
    <p style="margin:6px 0 0 0;color:#64748b;">The team at ${escapeHtml(propName)}</p>
  `;
  return {
    subject: `See you soon at ${propName}${checkIn ? ` — ${checkIn}` : ''}`,
    html: wrapBranding(ctx.property, inner),
  };
}

export function buildPostStayReviewEmail(ctx: TemplateContext): { subject: string; html: string } {
  const firstName = ctx.guest?.first_name ?? 'there';
  const propName = ctx.property?.name ?? 'our hotel';
  const reviewUrl = ctx.reviewUrl ?? `https://www.google.com/search?q=${encodeURIComponent(propName + ' reviews')}`;
  const inner = `
    <h2 style="font-size:22px;margin:0 0 16px 0;color:#0a0e1a;">Thank you for staying with us, ${escapeHtml(firstName)}</h2>
    <p style="margin:0 0 16px 0;">It was a pleasure to host you at <strong>${escapeHtml(propName)}</strong>. We hope every moment of your stay was everything you'd hoped for.</p>
    <p style="margin:0 0 16px 0;">If you have a couple of minutes, we'd be so grateful if you could share your experience with a quick review. It genuinely helps our small team — and it helps other travellers choose with confidence.</p>
    <p style="text-align:center;margin:28px 0;"><a href="${reviewUrl}" style="display:inline-block;background:#c9a84c;color:#0a0e1a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;letter-spacing:0.5px;">Leave a review</a></p>
    <p style="margin:0 0 16px 0;color:#64748b;font-size:14px;">And if anything fell short, please reply to this email directly — we'd love the chance to put it right and earn your next visit.</p>
    <p style="margin:24px 0 0 0;">Until next time,</p>
    <p style="margin:6px 0 0 0;color:#64748b;">The team at ${escapeHtml(propName)}</p>
  `;
  return {
    subject: `Thank you from ${propName}`,
    html: wrapBranding(ctx.property, inner),
  };
}

export function buildMarketingEmail(
  ctx: TemplateContext,
  params: { headline: string; body: string; ctaLabel?: string; ctaUrl?: string },
): { subject: string; html: string } {
  const propName = ctx.property?.name ?? 'our hotel';
  const firstName = ctx.guest?.first_name ?? 'there';
  const bodyHtml = params.body.split('\n').map((line) => `<p style="margin:0 0 14px 0;">${escapeHtml(line)}</p>`).join('');
  const inner = `
    <h2 style="font-size:22px;margin:0 0 16px 0;color:#0a0e1a;">${escapeHtml(params.headline)}</h2>
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
    ${bodyHtml}
    ${params.ctaUrl && params.ctaLabel ? `<p style="text-align:center;margin:28px 0;"><a href="${params.ctaUrl}" style="display:inline-block;background:#c9a84c;color:#0a0e1a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(params.ctaLabel)}</a></p>` : ''}
    <p style="margin:24px 0 0 0;color:#64748b;">Warm regards,</p>
    <p style="margin:6px 0 0 0;color:#64748b;">The team at ${escapeHtml(propName)}</p>
  `;
  return {
    subject: params.headline,
    html: wrapBranding(ctx.property, inner),
  };
}
