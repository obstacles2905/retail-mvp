'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthApiClient } from '@/lib/api-client';
import { createOffersSocket } from '@/lib/realtime/offers-socket';
import type { OfferDetail, OfferMessage } from '@/lib/types/offer';
import GlobalHeader from '@/components/layout/GlobalHeader';

interface DealChatProps {
  offerId: string;
  offer: OfferDetail | null;
  shortDealId: string;
  currentUserId: string;
  onSystemEvent?: () => void;
}

export function DealChat({ offerId, offer, shortDealId, currentUserId, onSystemEvent }: DealChatProps): JSX.Element {
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<ReturnType<typeof createOffersSocket> | null>(null);
  const onSystemEventRef = useRef(onSystemEvent);
  onSystemEventRef.current = onSystemEvent;

  const api = useMemo(() => getAuthApiClient(), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<OfferMessage[]>(`/offers/${offerId}/messages`)
      .then((res) => setMessages(res.data))
      .catch(() => setError('Не вдалося завантажити повідомлення'))
      .finally(() => setLoading(false));
  }, [api, offerId]);

  useEffect(() => {
    const socket = createOffersSocket();
    socketRef.current = socket;
    socket.emit('offers:join', { offerId });
    socket.on('offers:message:new', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.isSystemEvent) {
        onSystemEventRef.current?.();
      }
    });

    return () => {
      socket.off('offers:message:new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [offerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const getActorLabel = (m: OfferMessage): string => {
    if (m.senderId === currentUserId) return 'Ви';
    if (m.senderId === offer?.vendorId) return offer?.vendor?.name ?? 'Постачальник';
    if (m.senderId === offer?.buyerId) return offer?.buyer?.name ?? 'Закупник';
    return m.sender?.name ?? 'Учасник';
  };

  const formatSystemEvent = (m: OfferMessage): string => {
    const actor = getActorLabel(m);
    const isSelf = m.senderId === currentUserId;

    if (m.eventType === 'PRICE_CHANGED') {
      const oldPrice = typeof m.metaData?.oldPrice === 'string' ? m.metaData.oldPrice : '';
      const newPrice = typeof m.metaData?.newPrice === 'string' ? m.metaData.newPrice : '';
      const verb = isSelf ? 'змінили' : 'змінив(-ла)';
      const priceDetails = oldPrice && newPrice ? `: ${oldPrice} → ${newPrice} грн` : '';
      return `${actor} ${verb} ціну${priceDetails}`;
    }
    if (m.eventType === 'DEAL_ACCEPTED') {
      const verb = isSelf ? 'прийняли' : 'прийняв(-ла)';
      return `${actor} ${verb} умови угоди`;
    }
    if (m.eventType === 'TERMS_UPDATED') {
      const action = typeof m.metaData?.action === 'string' ? m.metaData.action : '';
      if (action === 'REJECTED') {
        const reason = typeof m.metaData?.reason === 'string' ? m.metaData.reason : '';
        const verb = isSelf ? 'відхилили' : 'відхилив(-ла)';
        return reason ? `${actor} ${verb} угоду: ${reason}` : `${actor} ${verb} угоду`;
      }
      if (action === 'BUYER_ORDER_CREATED') return 'Замовлення створено закупником';
      const verb = isSelf ? 'оновили' : 'оновив(-ла)';
      return `${actor} ${verb} умови`;
    }
    if (m.eventType === 'DELIVERY_RESCHEDULED') {
      const newDate = typeof m.metaData?.newDate === 'string' ? new Date(m.metaData.newDate).toLocaleDateString('uk-UA') : '';
      const verb = isSelf ? 'змінили' : 'змінив(-ла)';
      return newDate ? `${actor} ${verb} дату доставки на ${newDate}` : `${actor} ${verb} дату доставки`;
    }
    if (m.eventType === 'DELIVERY_CONFIRMED') {
      const verb = isSelf ? 'підтвердили' : 'підтвердив(-ла)';
      return `${actor} ${verb} отримання доставки`;
    }
    if (m.eventType === 'OFFER_ARCHIVED') {
      const verb = isSelf ? 'архівували' : 'архівував(-ла)';
      return `${actor} ${verb} угоду`;
    }
    return 'Системна подія';
  };

  const handleSend = (): void => {
    if (!text.trim() || sending) return;
    const socket = socketRef.current;
    if (!socket) return;
    setSending(true);
    socket.emit('offers:message:send', { offerId, content: text.trim() }, (res: { ok?: boolean; message?: OfferMessage }) => {
      if (res?.ok && res.message) {
        setMessages((prev) => (prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]));
        setText('');
      } else {
        setError('Не вдалося надіслати повідомлення');
      }
      setSending(false);
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">

      {/* Таймлайн повідомлень */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        <div className="mx-auto max-w-4xl space-y-4">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && messages.length === 0 && (
            <div className="flex justify-center py-4">
              <p className="text-xs text-muted-foreground">Поки немає повідомлень.</p>
            </div>
          )}
          {messages.map((m) =>
            m.isSystemEvent ? (
              <div key={m.id} className="flex justify-center">
                <div className="rounded-xl bg-muted px-4 py-2.5 text-center text-sm text-muted-foreground">
                  {formatSystemEvent(m)}
                </div>
              </div>
            ) : (
              <div key={m.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.sender?.companyName ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{m.content}</p>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-card p-4 w-[calc(100%-675px)] fixed bottom-0 left-[calc(260px+80px)]">
        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Додати файл"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="text"
            placeholder="Напишіть відповідь (можна обговорити логістику, упаковку, терміни)..."
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="rounded-lg bg-success p-2 text-success-foreground hover:bg-success/90 disabled:opacity-50"
            aria-label="Надіслати"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  );
}
