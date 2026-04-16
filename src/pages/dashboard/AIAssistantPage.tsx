import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, Plus, Trash2, MessageSquare, Loader2, Square, Settings2,
  Eye, EyeOff, ChevronLeft, Sparkles, Database, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useAppStore } from '@/store/useAppStore';
import ReactMarkdown from 'react-markdown';

// ============================================================
// Local storage key for the Claude API key
// ============================================================
const API_KEY_STORAGE = 'arrive_claude_api_key';

function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function storeApiKey(key: string) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // ignore
  }
}

// ============================================================
// Page Component
// ============================================================

export function AIAssistantPage() {
  const { isEnabled } = useFeatureToggles();
  const currentRole = useAppStore((s) => s.currentRole);

  // Only owners can see the AI assistant by default
  if (!isEnabled('ai_assistant')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={28} className="text-purple-400" />
          </div>
          <h2 className="text-xl font-display text-white mb-2">AI Assistant</h2>
          <p className="text-sm text-steel font-body leading-relaxed mb-4">
            The AI Assistant is a premium add-on that gives you a Claude-powered assistant with full access to all your property data.
          </p>
          {currentRole === 'owner' ? (
            <p className="text-xs text-steel/60 font-body">
              Enable it in <span className="text-teal">Settings → Feature Toggles</span>
            </p>
          ) : (
            <p className="text-xs text-steel/60 font-body">
              Ask your property owner to enable this feature.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <AIAssistantInner />;
}

// ============================================================
// Inner Component (feature is enabled)
// ============================================================

function AIAssistantInner() {
  const {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    sendMessage,
    isStreaming,
    stopStreaming,
    propertyContext,
  } = useAIAssistant();

  const property = useAppStore((s) => s.property);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !apiKey) return;
    setInput('');
    sendMessage(trimmed, apiKey);
  }, [input, isStreaming, apiKey, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    storeApiKey(key);
    setShowApiKeyInput(false);
  };

  const handleNewConversation = () => {
    createConversation.mutate();
  };

  // Context stats
  const contextStats = propertyContext
    ? {
        rooms: (propertyContext as Record<string, unknown[]>).rooms?.length ?? 0,
        bookings: ((propertyContext as Record<string, unknown[]>).todays_bookings?.length ?? 0) +
                  ((propertyContext as Record<string, unknown[]>).upcoming_bookings?.length ?? 0) +
                  ((propertyContext as Record<string, unknown[]>).recent_bookings?.length ?? 0),
        guests: (propertyContext as Record<string, unknown[]>).guests?.length ?? 0,
      }
    : null;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ---- Conversation sidebar ---- */}
      {showSidebar && (
        <div className="w-64 flex-shrink-0 border-r border-white/[0.06] bg-white/[0.02] flex flex-col">
          <div className="p-3 border-b border-white/[0.06]">
            <button
              onClick={handleNewConversation}
              disabled={createConversation.isPending}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-body bg-gradient-to-r from-teal/20 to-purple-500/10 text-teal hover:from-teal/25 hover:to-purple-500/15 border border-teal/20 transition-all duration-200"
            >
              <Plus size={16} />
              New Conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={20} className="mx-auto mb-2 text-steel/30" />
                <p className="text-xs text-steel/50 font-body">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200',
                    conv.id === activeConversationId
                      ? 'bg-gradient-to-r from-gold/[0.1] to-teal/[0.05] text-white'
                      : 'text-steel hover:text-silver hover:bg-white/[0.04]'
                  )}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="flex-1 text-xs font-body truncate">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.1] transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Context indicator */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-[10px] text-steel/60 font-body">
              <Database size={12} className="text-teal/60" />
              <span>
                {contextStats
                  ? `${contextStats.rooms} rooms · ${contextStats.bookings} bookings · ${contextStats.guests} guests`
                  : 'Loading context…'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---- Main chat area ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-steel hover:text-silver transition-all"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <ChevronLeft size={16} className={cn('transition-transform', !showSidebar && 'rotate-180')} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-teal/20 flex items-center justify-center">
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-sm font-display text-white">AI Assistant</h1>
                <p className="text-[10px] text-steel font-body">
                  {property?.name ?? 'Property'} · Full data access
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyInput((v) => !v)}
              className={cn(
                'p-2 rounded-lg transition-all',
                apiKey
                  ? 'text-teal/60 hover:text-teal hover:bg-teal/10'
                  : 'text-amber-400 hover:bg-amber-400/10 animate-pulse'
              )}
              title="API Key settings"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* API key banner */}
        {showApiKeyInput && (
          <ApiKeyBanner
            apiKey={apiKey}
            onSave={handleSaveApiKey}
            onCancel={() => apiKey && setShowApiKeyInput(false)}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {!activeConversationId ? (
            <EmptyState onNew={handleNewConversation} hasApiKey={!!apiKey} />
          ) : messages.length === 0 ? (
            <EmptyConversation onSuggest={(text) => {
              if (!apiKey || isStreaming) return;
              sendMessage(text, apiKey);
            }} />
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}

          {isStreaming && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-teal/20 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin text-teal" />
                <span className="text-sm text-steel font-body">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConversationId && (
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={apiKey ? 'Ask about your property…' : 'Enter your Claude API key first'}
                  disabled={!apiKey || isStreaming}
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white font-body placeholder:text-steel/40 outline-none focus:border-teal/30 focus:ring-1 focus:ring-teal/20 resize-none transition-all disabled:opacity-50"
                  style={{ maxHeight: 160 }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                  }}
                />
              </div>
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-all"
                  title="Stop"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !apiKey}
                  className="p-3 rounded-xl bg-gradient-to-r from-teal/20 to-purple-500/10 text-teal hover:from-teal/30 hover:to-purple-500/20 border border-teal/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Send (Enter)"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-steel/40 font-body text-center mt-2">
              AI responses are generated by Claude. Always verify critical information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ApiKeyBanner({
  apiKey, onSave, onCancel, showApiKey, setShowApiKey,
}: {
  apiKey: string;
  onSave: (key: string) => void;
  onCancel: () => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
}) {
  const [value, setValue] = useState(apiKey);

  return (
    <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/[0.05] to-purple-500/[0.03]">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-amber-400" />
          <p className="text-xs font-body font-semibold text-white">Claude API Key</p>
        </div>
        <p className="text-[11px] text-steel font-body mb-3">
          Enter your Anthropic API key to connect. Your key is stored locally in your browser only — it is never sent to our servers.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white font-mono placeholder:text-steel/30 outline-none focus:border-teal/30 transition-all"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-steel hover:text-silver transition-colors"
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={() => value.trim() && onSave(value.trim())}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg bg-teal/20 text-teal text-sm font-body hover:bg-teal/30 border border-teal/20 transition-all disabled:opacity-30"
          >
            Save
          </button>
          {apiKey && (
            <button
              onClick={onCancel}
              className="px-3 py-2 rounded-lg text-steel text-sm font-body hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew, hasApiKey }: { onNew: () => void; hasApiKey: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 via-teal/10 to-gold/10 flex items-center justify-center mb-6">
        <Bot size={36} className="text-purple-400" />
      </div>
      <h2 className="text-xl font-display text-white mb-2">Arrivé AI Assistant</h2>
      <p className="text-sm text-steel font-body max-w-md leading-relaxed mb-6">
        Your intelligent hotel management copilot. Ask about occupancy, revenue, guest requests, housekeeping, or anything else — the AI has full access to all your property data.
      </p>

      {!hasApiKey ? (
        <div className="max-w-md w-full mb-8">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] to-purple-500/[0.03] p-5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-amber-400" />
              <h3 className="text-sm font-display text-white">Step 1: Add your API Key</h3>
            </div>
            <p className="text-xs text-steel font-body leading-relaxed mb-3">
              Click the <Settings2 size={12} className="inline text-amber-400" /> settings icon in the top-right corner to enter your Anthropic API key. Your key stays in your browser — it's never sent to our servers.
            </p>
            <p className="text-[10px] text-steel/50 font-body">
              Don't have one? Get your API key at{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full mb-8">
            {[
              { icon: '📊', text: 'Occupancy & revenue analysis' },
              { icon: '🛎️', text: 'Guest requests & operations' },
              { icon: '💡', text: 'Pricing recommendations' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-steel font-body">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal/20 to-purple-500/10 text-teal font-body text-sm hover:from-teal/30 hover:to-purple-500/20 border border-teal/20 transition-all"
          >
            <Plus size={16} />
            Start a conversation
          </button>
        </>
      )}
    </div>
  );
}

function EmptyConversation({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
      <Sparkles size={24} className="text-purple-400 mb-3" />
      <p className="text-sm text-steel font-body">Ask me anything about your property.</p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-lg">
        {[
          "What's our occupancy rate today?",
          'Show me today\'s arrivals and departures',
          'Any pending maintenance or guest requests?',
          'Revenue summary for this week',
        ].map((q) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-steel/80 font-body cursor-pointer hover:bg-white/[0.08] hover:text-silver hover:border-white/[0.12] transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: { role: string; content: string; created_at: string } }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-3 max-w-3xl', isUser && 'ml-auto flex-row-reverse')}>
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        isUser
          ? 'bg-gradient-to-br from-gold/30 to-gold/10'
          : 'bg-gradient-to-br from-purple-500/30 to-teal/20'
      )}>
        {isUser ? (
          <span className="text-xs font-bold text-gold">You</span>
        ) : (
          <Bot size={16} className="text-purple-400" />
        )}
      </div>
      <div className={cn(
        'flex-1 min-w-0 rounded-2xl px-4 py-3',
        isUser
          ? 'bg-gradient-to-r from-gold/[0.08] to-gold/[0.03] border border-gold/10'
          : 'bg-white/[0.03] border border-white/[0.06]'
      )}>
        <div className="text-sm font-body text-silver leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
