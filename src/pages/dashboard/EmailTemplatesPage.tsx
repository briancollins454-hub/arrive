import { useState } from 'react';
import {
  Mail, Plus, X, Edit, Eye, ToggleLeft, ToggleRight, Copy, Check, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { MessageTemplate, MessageTrigger, MessageChannel } from '@/types';

// ============================================================
// Demo Templates
// ============================================================

const triggerLabels: Record<MessageTrigger, string> = {
  booking_confirmed: 'Booking Confirmed',
  pre_arrival: 'Pre-Arrival (24h before)',
  check_in_reminder: 'Check-In Reminder',
  check_out_reminder: 'Check-Out Reminder',
  post_stay: 'Post-Stay Thank You',
  cancellation: 'Cancellation',
  no_show: 'No-Show',
  custom: 'Custom',
};

const channelLabels: Record<MessageChannel, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', system: 'System',
};

const demoTemplates: MessageTemplate[] = [
  {
    id: 'tmpl1', property_id: 'demo-property-id', trigger: 'booking_confirmed', channel: 'email',
    name: 'Booking Confirmation', subject: 'Your Booking at Arrivé — {{confirmation_code}}',
    body: `Dear {{guest_name}},\n\nThank you for choosing Arrivé. Your booking has been confirmed.\n\nConfirmation: {{confirmation_code}}\nCheck-in: {{check_in_date}} (from {{check_in_time}})\nCheck-out: {{check_out_date}} (by {{check_out_time}})\nRoom: {{room_type}}\nNights: {{num_nights}}\nTotal: £{{total_amount}}\n\nIf you have any special requests, please don't hesitate to contact us.\n\nWe look forward to welcoming you.\n\nKind regards,\nThe Arrivé Team\n{{property_phone}} | {{property_email}}`,
    send_offset_hours: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'tmpl2', property_id: 'demo-property-id', trigger: 'pre_arrival', channel: 'email',
    name: 'Pre-Arrival Information', subject: 'Arriving tomorrow — What you need to know',
    body: `Dear {{guest_name}},\n\nWe're looking forward to welcoming you tomorrow!\n\nCheck-in from: {{check_in_time}}\nAddress: {{property_address}}\nParking: Complimentary on-site parking available\n\nPlease have your booking confirmation ({{confirmation_code}}) and photo ID ready at check-in.\n\nNeed anything? Reply to this email or call us on {{property_phone}}.\n\nSee you soon!\nThe Arrivé Team`,
    send_offset_hours: -24, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'tmpl3', property_id: 'demo-property-id', trigger: 'post_stay', channel: 'email',
    name: 'Post-Stay Thank You', subject: 'Thank you for staying with us, {{guest_first_name}}!',
    body: `Dear {{guest_name}},\n\nThank you for choosing Arrivé for your recent stay.\n\nWe hope you had a wonderful time and that every aspect of your stay exceeded expectations.\n\nWe'd love to hear your feedback — your review helps us continue to improve and helps other guests discover us.\n\n[Leave a Review]\n\nWe hope to welcome you back soon. As a returning guest, you'll always receive our best available rate when booking direct.\n\nWarm regards,\nThe Arrivé Team`,
    send_offset_hours: 24, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'tmpl4', property_id: 'demo-property-id', trigger: 'cancellation', channel: 'email',
    name: 'Cancellation Confirmation', subject: 'Booking Cancelled — {{confirmation_code}}',
    body: `Dear {{guest_name}},\n\nThis email confirms the cancellation of your booking.\n\nConfirmation: {{confirmation_code}}\nOriginal dates: {{check_in_date}} – {{check_out_date}}\n\n{{#if refund_amount}}A refund of £{{refund_amount}} will be processed within 5–7 business days.{{/if}}\n\nWe hope to welcome you in the future.\n\nKind regards,\nThe Arrivé Team`,
    send_offset_hours: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'tmpl5', property_id: 'demo-property-id', trigger: 'check_out_reminder', channel: 'email',
    name: 'Check-Out Reminder', subject: 'Check-out today — {{confirmation_code}}',
    body: `Dear {{guest_name}},\n\nJust a friendly reminder that check-out is today by {{check_out_time}}.\n\nPlease return your room key to reception. If you'd like a late check-out, please contact the front desk — we'll do our best to accommodate.\n\nWe hope you've enjoyed your stay!\n\nThe Arrivé Team`,
    send_offset_hours: 0, is_active: false, created_at: '', updated_at: '',
  },
];

// Merge field reference
const mergeFields = [
  '{{guest_name}}', '{{guest_first_name}}', '{{guest_email}}',
  '{{confirmation_code}}', '{{check_in_date}}', '{{check_out_date}}',
  '{{check_in_time}}', '{{check_out_time}}', '{{num_nights}}',
  '{{room_type}}', '{{total_amount}}', '{{nightly_rate}}',
  '{{property_name}}', '{{property_address}}', '{{property_phone}}', '{{property_email}}',
];

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState(demoTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', trigger: 'custom' as MessageTrigger, channel: 'email' as MessageChannel,
    subject: '', body: '', send_offset_hours: 0,
  });
  const resetForm = () => {
    setForm({ name: '', trigger: 'custom', channel: 'email', subject: '', body: '', send_offset_hours: 0 });
    setShowForm(false);
    setEditingId(null);
  };
  const handleSave = () => {
    if (!form.name || !form.body) return;
    if (editingId) {
      setTemplates(ts => ts.map(t => t.id === editingId ? { ...t, ...form, updated_at: new Date().toISOString() } : t));
    } else {
      setTemplates(ts => [...ts, {
        id: `tmpl-${Date.now()}`, property_id: 'demo-property-id',
        ...form, subject: form.subject || null,
        is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
    }
    resetForm();
  };
  const startEdit = (t: MessageTemplate) => {
    setForm({
      name: t.name, trigger: t.trigger, channel: t.channel,
      subject: t.subject ?? '', body: t.body,
      send_offset_hours: t.send_offset_hours,
    });
    setEditingId(t.id);
    setShowForm(true);
  };
  const copyField = (field: string) => {
    navigator.clipboard.writeText(field);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const previewTemplate = templates.find(t => t.id === previewId);

  // Mock preview — replace merge fields with sample data
  const previewBody = (body: string) => {
    return body
      .replace(/\{\{guest_name\}\}/g, 'Sarah Mitchell')
      .replace(/\{\{guest_first_name\}\}/g, 'Sarah')
      .replace(/\{\{guest_email\}\}/g, 'sarah@email.com')
      .replace(/\{\{confirmation_code\}\}/g, 'AR-TK82NP')
      .replace(/\{\{check_in_date\}\}/g, '15 March 2026')
      .replace(/\{\{check_out_date\}\}/g, '18 March 2026')
      .replace(/\{\{check_in_time\}\}/g, '3:00 PM')
      .replace(/\{\{check_out_time\}\}/g, '11:00 AM')
      .replace(/\{\{num_nights\}\}/g, '3')
      .replace(/\{\{room_type\}\}/g, 'Deluxe Double')
      .replace(/\{\{total_amount\}\}/g, '567.00')
      .replace(/\{\{nightly_rate\}\}/g, '189.00')
      .replace(/\{\{property_name\}\}/g, 'Arrivé')
      .replace(/\{\{property_address\}\}/g, '1 Harbour Road, Tenby, SA70 7BP')
      .replace(/\{\{property_phone\}\}/g, '+44 1834 842000')
      .replace(/\{\{property_email\}\}/g, 'hello@arrive-hotel.com');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Email Templates</h1>
          <p className="text-silver text-sm mt-1">
            Automated guest communications with merge fields
          </p>
        </div>
        <Button variant="teal" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {/* Merge Fields Reference */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="text-xs text-silver uppercase tracking-wider mb-2">Available Merge Fields</h3>
        <div className="flex flex-wrap gap-1.5">
          {mergeFields.map(f => (
            <button
              key={f}
              className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-teal border border-white/[0.06] hover:bg-teal/10 transition-colors flex items-center gap-1"
              onClick={() => copyField(f)}
            >
              {copiedField === f ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glass-panel rounded-xl p-6 space-y-4 border border-teal/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Template' : 'New Template'}</h2>
            <button onClick={resetForm} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-silver mb-1">Template Name *</label>
              <input className="input-dark w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Trigger</label>
              <select className="input-dark w-full" value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value as MessageTrigger }))}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-silver mb-1">Channel</label>
              <select className="input-dark w-full" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as MessageChannel }))}>
                {Object.entries(channelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-silver mb-1">Subject Line</label>
              <input className="input-dark w-full" placeholder="Email subject with {{merge_fields}}" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-silver mb-1">Body *</label>
              <textarea className="input-dark w-full font-mono text-xs" rows={10} placeholder="Template body with {{merge_fields}}..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost-dark" onClick={resetForm}>Cancel</Button>
            <Button variant="teal" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="glass-panel rounded-xl p-6 border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Preview: {previewTemplate.name}</h2>
            <button onClick={() => setPreviewId(null)} className="text-silver hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          {previewTemplate.subject && (
            <div className="mb-3">
              <span className="text-xs text-silver">Subject:</span>
              <p className="text-white text-sm font-medium">{previewBody(previewTemplate.subject)}</p>
            </div>
          )}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans">{previewBody(previewTemplate.body)}</pre>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className={cn('glass-panel rounded-xl p-5', !t.is_active && 'opacity-50')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className={cn('w-5 h-5', t.is_active ? 'text-teal' : 'text-silver/40')} />
                <div>
                  <h3 className="text-white font-medium text-sm">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-silver border border-white/[0.06]">{triggerLabels[t.trigger]}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-silver border border-white/[0.06]">{channelLabels[t.channel]}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost-dark" size="sm" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />Preview
                </Button>
                <Button variant="ghost-dark" size="sm" onClick={() => startEdit(t)}>
                  <Edit className="w-3.5 h-3.5 mr-1" />Edit
                </Button>
                <Button variant="ghost-dark" size="sm" onClick={() => setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))}>
                  {t.is_active ? <ToggleRight className="w-3.5 h-3.5 text-teal" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost-dark" size="sm" onClick={() => setTemplates(ts => ts.filter(x => x.id !== t.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
