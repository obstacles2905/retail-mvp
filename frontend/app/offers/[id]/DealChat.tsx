'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthApiClient } from '@/lib/api-client';
import { createOffersSocket } from '@/lib/realtime/offers-socket';
import type { OfferDetail, OfferMessage } from '@/lib/types/offer';

interface DealChatProps {
  offerId: string;
  offer: OfferDetail | null;
  shortDealId: string;
}

export function DealChat({ offerId, offer, shortDealId }: DealChatProps): JSX.Element {
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<ReturnType<typeof createOffersSocket> | null>(null);

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

  const formatSystemEvent = (m: OfferMessage): string => {
    if (m.eventType === 'PRICE_CHANGED') {
      const oldPrice = typeof m.metaData?.oldPrice === 'string' ? m.metaData.oldPrice : '';
      const newPrice = typeof m.metaData?.newPrice === 'string' ? m.metaData.newPrice : '';
      return oldPrice && newPrice ? `Зміна ціни: ${oldPrice} → ${newPrice} грн` : 'Зміна ціни';
    }
    if (m.eventType === 'DEAL_ACCEPTED') return 'Угоду узгоджено';
    if (m.eventType === 'TERMS_UPDATED') {
      const action = typeof m.metaData?.action === 'string' ? m.metaData.action : '';
      if (action === 'REJECTED') {
        const reason = typeof m.metaData?.reason === 'string' ? m.metaData.reason : '';
        return reason ? `Угоду відхилено: ${reason}` : 'Угоду відхилено';
      }
      if (action === 'BUYER_ORDER_CREATED') return 'Замовлення створено закупником';
      return 'Оновлення умов';
    }
    if (m.eventType === 'DELIVERY_RESCHEDULED') {
      const newDate = typeof m.metaData?.newDate === 'string' ? new Date(m.metaData.newDate).toLocaleDateString('uk-UA') : '';
      return newDate ? `Дату доставки змінено на ${newDate}` : 'Дату доставки змінено';
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
    <section className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Хедер блоку чату */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold text-gray-900">Історія переговорів</h2>
        </div>
        <span className="text-xs font-medium text-gray-500">{shortDealId}</span>
      </header>

      {/* Таймлайн повідомлень */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {!loading && !error && messages.length === 0 && (
            <div className="flex justify-center py-4">
              <p className="text-xs text-gray-400">Поки немає повідомлень.</p>
            </div>
          )}
          {messages.map((m) =>
            m.isSystemEvent ? (
              <div key={m.id} className="flex justify-center">
                <div className="rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm text-gray-600">
                  {formatSystemEvent(m)}
                </div>
              </div>
            ) : (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {m.sender?.companyName ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{m.content}</p>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Поле вводу відповіді */}
      <footer className="shrink-0 border-t border-gray-200 p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400">
          <button
            type="button"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            aria-label="Додати файл"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="text"
            placeholder="Напишіть відповідь (можна обговорити логістику, упаковку, терміни)..."
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
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
            className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50"
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
