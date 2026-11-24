import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { formatClock } from '../lib/utils';
import { Button, EmptyState, Panel } from './ui';
import type { Message } from '../types';

export function MessagesPanel({ showId }: { showId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .messages(showId)
      .then((result) => {
        if (!cancelled) setMessages(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Poll slowly to pick up operator replies (realtime messages arrive via socket).
    const timer = window.setInterval(() => {
      api
        .messages(showId)
        .then((result) => {
          if (!cancelled) setMessages(result);
        })
        .catch(() => undefined);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [showId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    try {
      const message = await api.sendMessage(showId, { text: body, fromName: 'Regie' });
      setMessages((prev) => [...prev, message]);
    } catch {
      setText(body);
    }
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <MessageSquare size={14} /> Crew communicatie
        </span>
      }
      bodyClassName="p-0 flex flex-col"
    >
      <div className="max-h-72 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-sm text-base-400">Laden...</p>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={24} />}
            title="Geen berichten"
            description="Stuur een bericht naar de crew."
          />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm',
                message.kind === 'emergency'
                  ? 'bg-live-500/15 border border-live-500/40 text-live-500'
                  : message.toCrewId
                    ? 'bg-accent-500/10 border border-accent-500/30'
                    : 'bg-base-800',
              )}
            >
              <div className="flex items-center gap-2 text-[11px] text-base-400 mb-0.5">
                <span className="font-medium text-base-200">{message.fromName}</span>
                <span>{formatClock(message.createdAt)}</span>
              </div>
              <p className="text-base-100 leading-snug">{message.text}</p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-base-700">
        <input
          className="input flex-1"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Bericht naar de crew..."
          onKeyDown={(event) => {
            if (event.key === 'Enter') void send();
          }}
        />
        <Button variant="primary" onClick={() => void send()} disabled={!text.trim()}>
          <Send size={15} />
        </Button>
      </div>
    </Panel>
  );
}
