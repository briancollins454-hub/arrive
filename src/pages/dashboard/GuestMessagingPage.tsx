import { useState, useRef, useEffect } from 'react';
import { format, parseISO, subHours, subMinutes, subDays } from 'date-fns';
import {
  MessageCircle, Send, Phone, Mail, Search, CheckCheck, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { isDemoMode } from '@/lib/supabase';


interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: 'whatsapp' | 'sms' | 'email';
  body: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface GuestThread {
  guestName: string;
  guestId: string;
  bookingId: string;
  roomNumber: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  channel: 'whatsapp' | 'sms' | 'email';
  messages: ChatMessage[];
}

const today = new Date();

const demoThreads: GuestThread[] = [
  {
    guestName: 'David Chen', guestId: 'g4', bookingId: '4', roomNumber: '202',
    lastMessage: 'Could we get extra towels sent up please?', lastTime: subMinutes(today, 15).toISOString(),
    unread: 1, channel: 'whatsapp',
    messages: [
      { id: 'm1', direction: 'outbound', channel: 'whatsapp', body: 'Welcome to Arrivé, David! 🏨 We hope you have a wonderful stay. If you need anything, just message us here.', timestamp: subDays(today, 1).toISOString(), status: 'read' },
      { id: 'm2', direction: 'inbound', channel: 'whatsapp', body: 'Thank you! The room is lovely. Could you recommend a good restaurant nearby?', timestamp: subHours(today, 20).toISOString(), status: 'read' },
      { id: 'm3', direction: 'outbound', channel: 'whatsapp', body: 'Of course! We recommend The Harbour Kitchen (5 min walk) for seafood, or Pier 21 for fine dining. Shall I book a table?', timestamp: subHours(today, 19).toISOString(), status: 'read' },
      { id: 'm4', direction: 'inbound', channel: 'whatsapp', body: "That sounds great, Harbour Kitchen for 2 at 7:30pm tonight please!", timestamp: subHours(today, 18).toISOString(), status: 'read' },
      { id: 'm5', direction: 'outbound', channel: 'whatsapp', body: "All booked! Table for 2 at The Harbour Kitchen tonight at 7:30pm. It's a 5-minute walk — turn left out of the hotel entrance. Enjoy! 🍽️", timestamp: subHours(today, 17).toISOString(), status: 'read' },
      { id: 'm6', direction: 'inbound', channel: 'whatsapp', body: 'Could we get extra towels sent up please?', timestamp: subMinutes(today, 15).toISOString(), status: 'delivered' },
    ],
  },
  {
    guestName: 'Maria Fernandez', guestId: 'g3', bookingId: '3', roomNumber: '302',
    lastMessage: 'Absolutely, I can arrange that for you.', lastTime: subHours(today, 2).toISOString(),
    unread: 0, channel: 'whatsapp',
    messages: [
      { id: 'm7', direction: 'outbound', channel: 'whatsapp', body: 'Welcome back to Arrivé, Maria! 🌟 As a returning guest, we\'ve prepared your room with the extra pillows you prefer.', timestamp: subDays(today, 3).toISOString(), status: 'read' },
      { id: 'm8', direction: 'inbound', channel: 'whatsapp', body: "That's so thoughtful, thank you! Could we arrange a late checkout on our last day? It's our anniversary.", timestamp: subDays(today, 2).toISOString(), status: 'read' },
      { id: 'm9', direction: 'outbound', channel: 'whatsapp', body: 'Happy anniversary! 🥂 Absolutely, I can arrange that for you.', timestamp: subHours(today, 2).toISOString(), status: 'read' },
    ],
  },
  {
    guestName: 'Liam Murphy', guestId: 'g9', bookingId: '9', roomNumber: '204',
    lastMessage: 'Your taxi is confirmed for 10am tomorrow.', lastTime: subHours(today, 5).toISOString(),
    unread: 0, channel: 'sms',
    messages: [
      { id: 'm10', direction: 'inbound', channel: 'sms', body: 'Hi, can I arrange a taxi to Bristol Airport for checkout tomorrow morning?', timestamp: subHours(today, 8).toISOString(), status: 'read' },
      { id: 'm11', direction: 'outbound', channel: 'sms', body: 'Of course! What time is your flight? We recommend leaving about 2 hours before departure.', timestamp: subHours(today, 7).toISOString(), status: 'read' },
      { id: 'm12', direction: 'inbound', channel: 'sms', body: 'Flight is at 1pm so 10am pickup would be perfect', timestamp: subHours(today, 6).toISOString(), status: 'read' },
      { id: 'm13', direction: 'outbound', channel: 'sms', body: 'Your taxi is confirmed for 10am tomorrow. The driver will meet you at reception. Safe travels! ✈️', timestamp: subHours(today, 5).toISOString(), status: 'delivered' },
    ],
  },
  {
    guestName: 'Anna Kowalski', guestId: 'g10', bookingId: '10', roomNumber: '107',
    lastMessage: 'Welcome to Arrivé! If you need anything, text us.', lastTime: subDays(today, 2).toISOString(),
    unread: 0, channel: 'sms',
    messages: [
      { id: 'm14', direction: 'outbound', channel: 'sms', body: 'Welcome to Arrivé! If you need anything, text us.', timestamp: subDays(today, 2).toISOString(), status: 'delivered' },
    ],
  },
];

export function GuestMessagingPage() {
  const [threads, setThreads] = useState(isDemoMode ? demoThreads : []);
  const [selectedThread, setSelectedThread] = useState<string>(threads[0]?.bookingId ?? '');
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.bookingId === selectedThread);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length]);

  const sendMessage = () => {
    if (!newMessage.trim() || !activeThread) return;
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      direction: 'outbound',
      channel: activeThread.channel,
      body: newMessage.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    setThreads(ts => ts.map(t =>
      t.bookingId === selectedThread
        ? { ...t, messages: [...t.messages, msg], lastMessage: msg.body, lastTime: msg.timestamp }
        : t
    ));
    setNewMessage('');
    // Simulate delivery
    setTimeout(() => {
      setThreads(ts => ts.map(t =>
        t.bookingId === selectedThread
          ? { ...t, messages: t.messages.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m) }
          : t
      ));
    }, 1500);
  };

  const filteredThreads = threads.filter(t =>
    !search || t.guestName.toLowerCase().includes(search.toLowerCase()) || t.roomNumber.includes(search)
  );

  const channelIcon = (ch: string) => {
    if (ch === 'whatsapp') return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (ch === 'sms') return <Phone className="w-3.5 h-3.5 text-blue-400" />;
    return <Mail className="w-3.5 h-3.5 text-silver" />;
  };

  const statusIcon = (s: string) => {
    if (s === 'read') return <CheckCheck className="w-3 h-3 text-blue-400" />;
    if (s === 'delivered') return <CheckCheck className="w-3 h-3 text-silver" />;
    return <Check className="w-3 h-3 text-silver" />;
  };

  return (
    <div className="h-[calc(100vh-8rem)] p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Guest Messaging</h1>
          <p className="text-silver text-sm mt-1">WhatsApp & SMS conversations with in-house guests</p>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100%-3.5rem)] glass-panel rounded-xl overflow-hidden">
        {/* Thread List */}
        <div className="w-80 border-r border-white/[0.06] flex flex-col shrink-0">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
              <input className="input-dark w-full pl-9 text-sm" placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredThreads.map(t => (
              <button
                key={t.bookingId}
                className={cn(
                  'w-full px-3 py-3 text-left border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors',
                  selectedThread === t.bookingId && 'bg-white/[0.04]'
                )}
                onClick={() => {
                  setSelectedThread(t.bookingId);
                  // Clear unread
                  setThreads(ts => ts.map(x => x.bookingId === t.bookingId ? { ...x, unread: 0 } : x));
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-charcoal flex items-center justify-center text-teal text-xs font-semibold shrink-0">
                    {t.guestName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium truncate">{t.guestName}</span>
                      <span className="text-[10px] text-silver/60">{format(parseISO(t.lastTime), 'HH:mm')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {channelIcon(t.channel)}
                      <span className="text-xs text-silver truncate">{t.lastMessage}</span>
                    </div>
                    <span className="text-[10px] text-silver/50">Rm {t.roomNumber}</span>
                  </div>
                  {t.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-teal text-midnight text-[10px] font-bold flex items-center justify-center shrink-0">{t.unread}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-teal text-xs font-semibold">
                  {activeThread.guestName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <span className="text-white font-medium text-sm">{activeThread.guestName}</span>
                  <span className="text-silver text-xs ml-2">Room {activeThread.roomNumber}</span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {channelIcon(activeThread.channel)}
                  <span className="text-xs text-silver capitalize">{activeThread.channel}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {activeThread.messages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                      msg.direction === 'outbound'
                        ? 'bg-teal/20 text-white rounded-br-md'
                        : 'bg-white/[0.06] text-white rounded-bl-md'
                    )}>
                      <p>{msg.body}</p>
                      <div className={cn('flex items-center gap-1 mt-1', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                        <span className="text-[10px] text-silver/50">{format(parseISO(msg.timestamp), 'HH:mm')}</span>
                        {msg.direction === 'outbound' && statusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <input
                    className="input-dark flex-1"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <Button variant="teal" size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-silver">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
