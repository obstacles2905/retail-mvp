'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FileMessageAttachment } from '@/components/FileMessageAttachment';
import { FileUploader } from '@/components/FileUploader';
import { getAuthApiClient } from '@/lib/api-client';
import { serializeChatFileMessage, parseChatFileMessage } from '@/lib/chat-file-message';
import { createOffersSocket } from '@/lib/realtime/offers-socket';
import type { OfferDetail, OfferMessage } from '@/lib/types/offer';
import { useRightSidebar } from '@/components/layout/RightSidebarContext';
import {
  DEAL_OFFER_SIDEBAR_WIDTH_PX,
  GLOBAL_NAV_WIDTH_PX,
  RIGHT_CONTEXT_SIDEBAR_WIDTH_PX,
} from '@/lib/dashboard-layout';
import { cn } from '@/lib/utils';

interface DealChatProps {
  offerId: string;
  offer: OfferDetail | null;
  shortDealId: string;
  currentUserId: string;
  onSystemEvent?: () => void;
}

export function DealChat({ offerId, offer, shortDealId, currentUserId, onSystemEvent }: DealChatProps): JSX.Element {
  const { isOpen: rightSidebarOpen } = useRightSidebar();
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

    const joinRoom = () => {
      socket.emit('offers:join', { offerId });
    };

    socket.on('connect', joinRoom);
    socket.on('offers:message:new', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.isSystemEvent) {
        onSystemEventRef.current?.();
      }
    });

    if (socket.connected) joinRoom();

    return () => {
      socket.off('connect', joinRoom);
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
      const verb = isSelf ? 'змінили' : 'змінив(-ла)';
      const items = Array.isArray(m.metaData?.items) ? (m.metaData!.items as { productName?: string; oldPrice?: string; newPrice?: string }[]) : [];
      if (items.length > 0) {
        const details = items.map(i => `${i.productName ?? 'Товар'}: ${i.oldPrice} → ${i.newPrice} грн`).join('; ');
        return `${actor} ${verb} ціни: ${details}`;
      }
      const oldPrice = typeof m.metaData?.oldPrice === 'string' ? m.metaData.oldPrice : '';
      const newPrice = typeof m.metaData?.newPrice === 'string' ? m.metaData.newPrice : '';
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

  const sendOfferContent = useCallback(
    (content: string) => {
      setError(null);
      setSending(true);
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit(
          'offers:message:send',
          { offerId, content },
          (res: { ok?: boolean; message?: OfferMessage }) => {
            if (res?.ok && res.message) {
              setMessages((prev) =>
                prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!],
              );
              setText('');
            } else {
              setError('Не вдалося надіслати повідомлення');
            }
            setSending(false);
          },
        );
      } else {
        api
          .post<OfferMessage>(`/offers/${offerId}/messages`, { content })
          .then((res) => {
            setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
            setText('');
          })
          .catch(() => setError('Не вдалося надіслати повідомлення'))
          .finally(() => setSending(false));
      }
    },
    [api, offerId],
  );

  const handleSend = (): void => {
    if (!text.trim() || sending) return;
    sendOfferContent(text.trim());
  };

  const handleFileUploaded = useCallback(
    (fileKey: string, fileName: string) => {
      const content = serializeChatFileMessage({ kind: 'file', fileKey, fileName });
      sendOfferContent(content);
    },
    [sendOfferContent],
  );

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
          {messages.map((m) => {
            if (m.isSystemEvent) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="rounded-xl bg-muted px-4 py-2.5 text-center text-sm text-muted-foreground">
                    {formatSystemEvent(m)}
                  </div>
                </div>
              );
            }
            const filePayload = m.content ? parseChatFileMessage(m.content) : null;
            return (
              <div key={m.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.sender?.companyName ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {filePayload ? (
                    <FileMessageAttachment fileKey={filePayload.fileKey} fileName={filePayload.fileName} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer
        className={cn(
          'fixed bottom-0 shrink-0 border-t border-border bg-card p-4',
          'transition-[width] duration-300 ease-in-out will-change-[width]',
        )}
        style={{
          left: GLOBAL_NAV_WIDTH_PX,
          width: rightSidebarOpen
            ? `calc(100% - ${GLOBAL_NAV_WIDTH_PX}px - ${DEAL_OFFER_SIDEBAR_WIDTH_PX}px - ${RIGHT_CONTEXT_SIDEBAR_WIDTH_PX}px)`
            : `calc(100% - ${GLOBAL_NAV_WIDTH_PX}px - ${DEAL_OFFER_SIDEBAR_WIDTH_PX + 1}px)`,
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <FileUploader onSuccess={handleFileUploaded} disabled={sending} className="shrink-0" />
          <input
            type="text"
            placeholder="Напишіть відповідь (можна обговорити логістику, упаковку, терміни)..."
            maxLength={2000}
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
