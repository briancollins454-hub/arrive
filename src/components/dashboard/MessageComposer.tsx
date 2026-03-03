import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { Send, Mail, MessageCircle } from 'lucide-react';
import type { Guest } from '@/types';

interface MessageComposerProps {
  guest?: Guest | null;
  onSend: (data: { channel: string; subject?: string; body: string }) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const MessageComposer: FC<MessageComposerProps> = ({
  guest,
  onSend,
  isLoading,
  onCancel,
}) => {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');

  const { register, handleSubmit, formState: { errors } } = useForm<{
    subject: string;
    body: string;
  }>({
    defaultValues: {
      subject: '',
      body: '',
    },
  });

  const onSubmit = (data: { subject: string; body: string }) => {
    onSend({
      channel,
      subject: channel === 'email' ? data.subject : undefined,
      body: data.body,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {guest && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-midnight border border-slate">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
            {guest.first_name.charAt(0)}{guest.last_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm text-white font-body">{guest.first_name} {guest.last_name}</p>
            <p className="text-xs text-steel font-body">{guest.email ?? guest.phone}</p>
          </div>
        </div>
      )}

      <div>
        <Label variant="dark">Channel</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as 'email' | 'sms')}>
          <SelectTrigger variant="dark">
            <SelectValue />
          </SelectTrigger>
          <SelectContent variant="dark">
            <SelectItem value="email">
              <div className="flex items-center gap-2">
                <Mail size={14} /> Email
              </div>
            </SelectItem>
            <SelectItem value="sms">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} /> SMS
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {channel === 'email' && (
        <div>
          <Label variant="dark">Subject</Label>
          <Input variant="dark" {...register('subject')} placeholder="Message subject…" />
        </div>
      )}

      <div>
        <Label variant="dark">Message *</Label>
        <Textarea
          variant="dark"
          {...register('body', { required: 'Message is required' })}
          placeholder="Type your message…"
          rows={channel === 'sms' ? 3 : 6}
        />
        {errors.body && <p className="text-xs text-danger mt-1">{errors.body.message}</p>}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && <Button type="button" variant="ghost-dark" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="teal" disabled={isLoading}>
          <Send size={14} className="mr-2" />
          {isLoading ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  );
};
