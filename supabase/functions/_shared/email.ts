// supabase/functions/_shared/email.ts
// ============================================================
// Platform email sender + branded HTML templates.
// ============================================================
// Uses a SINGLE platform-wide Resend account (RESEND_API_KEY) so
// onboarding/invite emails always send without per-property setup.
// Password-reset / confirmation emails are handled separately by
// Supabase Auth's own SMTP (configured to the same Resend account).
// ============================================================

const BRAND = {
  name: 'Arrivé',
  gold: '#C9A84C',
  bg: '#0B1120',
  panel: '#111c30',
  text: '#E2E8F0',
  muted: '#94A3B8',
};

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/** Send an email via the platform Resend account. Throws on failure. */
export async function sendPlatformEmail({ to, subject, html }: SendArgs): Promise<string> {
  const apiKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured on the function.');
  }
  const fromEmail = (Deno.env.get('PLATFORM_FROM_EMAIL') ?? 'onboarding@resend.dev').trim();
  const fromName = (Deno.env.get('PLATFORM_FROM_NAME') ?? BRAND.name).trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `Resend error (${res.status})`);
  }
  return body?.id ?? '';
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.panel};border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 36px 8px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:0.5px;color:${BRAND.gold};">${BRAND.name}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 36px;color:${BRAND.text};font-size:15px;line-height:1.6;">
          <h1 style="font-size:20px;font-weight:600;color:#ffffff;margin:16px 0 12px;">${title}</h1>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="max-width:480px;color:${BRAND.muted};font-size:11px;line-height:1.5;margin:20px auto 0;text-align:center;">
        Sent by ${BRAND.name}. If you weren't expecting this email, you can safely ignore it.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${BRAND.gold};">
    <a href="${href}" style="display:inline-block;padding:13px 26px;color:#0B1120;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>`;
}

function linkFallback(url: string): string {
  return `<p style="color:${BRAND.muted};font-size:12px;line-height:1.5;margin:8px 0 0;">Or paste this link into your browser:<br/>
    <a href="${url}" style="color:${BRAND.gold};word-break:break-all;">${url}</a></p>`;
}

/** Owner onboarding email — sent when the platform admin onboards a hotel. */
export function ownerSetupEmail(args: { ownerName: string; propertyName: string; inviteUrl: string }): { subject: string; html: string } {
  const { ownerName, propertyName, inviteUrl } = args;
  const subject = `Welcome to ${BRAND.name} — set up ${propertyName}`;
  const html = shell('Your hotel is ready to set up', `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(ownerName)},</p>
    <p style="margin:0 0 12px;">An account has been created for <strong style="color:#fff;">${escapeHtml(propertyName)}</strong> on ${BRAND.name}, the all-in-one platform for boutique hotels.</p>
    <p style="margin:0 0 4px;">Click below to set your password and access your dashboard. You'll be the <strong style="color:#fff;">Owner</strong> with full access.</p>
    ${button(inviteUrl, 'Set up my account')}
    <p style="margin:0 0 4px;color:${BRAND.muted};font-size:13px;">This secure link expires in 7 days.</p>
    ${linkFallback(inviteUrl)}
  `);
  return { subject, html };
}

/** Staff invite email — sent when an owner/manager invites a team member. */
export function staffInviteEmail(args: { name: string; propertyName: string; roleLabel: string; inviteUrl: string }): { subject: string; html: string } {
  const { name, propertyName, roleLabel, inviteUrl } = args;
  const subject = `You're invited to join ${propertyName} on ${BRAND.name}`;
  const html = shell("You've been invited", `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 12px;">You've been invited to join <strong style="color:#fff;">${escapeHtml(propertyName)}</strong> on ${BRAND.name} as <strong style="color:#fff;">${escapeHtml(roleLabel)}</strong>.</p>
    <p style="margin:0 0 4px;">Click below to create your password and get started.</p>
    ${button(inviteUrl, 'Accept invitation')}
    <p style="margin:0 0 4px;color:${BRAND.muted};font-size:13px;">This secure link expires in 7 days.</p>
    ${linkFallback(inviteUrl)}
  `);
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
