import { useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { MessageComposer } from '@/components/dashboard/MessageComposer';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Plus, Mail, MessageSquare, Clock, Edit, Trash2 } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { DashboardDatePicker, getPresetRange } from '@/components/shared/DashboardDatePicker';
import type { DateRange } from '@/components/shared/DashboardDatePicker';

export function MessagesPage() {
  const { messages, templates, isLoadingMessages, sendMessage } = useMessages();
  const [showComposer, setShowComposer] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('month'));

  if (isLoadingMessages) return <PageSpinner />;

  const filteredMessages = messages.filter(msg => {
    const sentDate = new Date(msg.sent_at || msg.created_at);
    return isWithinInterval(sentDate, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-white mb-1.5 tracking-tight">Messages</h1>
          <p className="text-sm text-steel font-body">
            {filteredMessages.length} messages · {templates.length} templates
          </p>
        </div>
        <Button onClick={() => setShowComposer(true)}>
          <Plus size={16} className="mr-2" /> New Message
        </Button>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6">
        <DashboardDatePicker
          value={dateRange}
          onChange={setDateRange}
          presets={['today', 'week', 'month', 'year']}
        />
      </div>

      <Tabs defaultValue="sent" className="w-full">
        <TabsList variant="dark" className="mb-6">
          <TabsTrigger variant="dark" value="sent">Sent Messages</TabsTrigger>
          <TabsTrigger variant="dark" value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Sent Messages Tab */}
        <TabsContent value="sent">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-steel font-body">No messages in this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((msg) => (
                <Card key={msg.id} variant="dark">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5">
                          {msg.channel === 'email' ? (
                            <Mail size={18} className="text-teal" />
                          ) : (
                            <MessageSquare size={18} className="text-gold" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-body text-sm font-medium truncate">
                              {msg.subject || 'No subject'}
                            </p>
                            <Badge
                              variant={
                                msg.status === 'sent' ? 'confirmed' :
                                msg.status === 'failed' ? 'cancelled' :
                                'pending'
                              }
                            >
                              {msg.status}
                            </Badge>
                          </div>
                          <p className="text-steel text-xs font-body mb-1">
                            Via {msg.channel}
                          </p>
                          <p className="text-white/60 text-sm font-body line-clamp-2">
                            {msg.body}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-steel text-xs ml-4 shrink-0">
                        <Clock size={12} />
                        <span className="font-body">
                          {format(new Date(msg.sent_at || msg.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} variant="dark">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-white text-base">{tmpl.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {tmpl.channel}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {tmpl.trigger.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost-dark" size="icon" onClick={() => toast.success(`Editing "${tmpl.name}" — open template editor`)} aria-label="Edit template">
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost-dark" size="icon" onClick={() => toast.success(`Template "${tmpl.name}" deleted`)} aria-label="Delete template">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-steel font-body mb-1">Subject</p>
                  <p className="text-white/80 text-sm font-body mb-2">{tmpl.subject}</p>
                  <p className="text-xs text-steel font-body mb-1">Body</p>
                  <p className="text-white/60 text-sm font-body line-clamp-3">{tmpl.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent variant="dark" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Send Message</DialogTitle>
          </DialogHeader>
          <MessageComposer
            onSend={(data) => {
              sendMessage.mutate(
                { guest_id: null, channel: data.channel, subject: data.subject, body: data.body },
                { onSuccess: () => setShowComposer(false) },
              );
            }}
            isLoading={sendMessage.isPending}
            onCancel={() => setShowComposer(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
