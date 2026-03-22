'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthApiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import type { ChatDetailsDto, ChatMessageDto } from '@/lib/types/chat';
import { createChatsSocket, type ChatsSocket } from '@/lib/realtime/chats-socket';

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ChatDialogPage() {
  const params = useParams();
  const chatId = params.id as string;
  const api = useMemo(() => getAuthApiClient(), []);
  const currentUser = getStoredUser();

  const [chat, setChat] = useState<ChatDetailsDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const socketRef = useRef<ChatsSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    api.get<ChatDetailsDto>(`/chats/${chatId}`)
      .then((res) => {
        setChat(res.data);
        setMessages(res.data.messages);
        setTimeout(scrollToBottom, 100);
      })
      .catch(() => setError('Не вдалося завантажити чат'))
      .finally(() => setLoading(false));

    api.post(`/chats/${chatId}/read`).catch(console.error);

    const socket = createChatsSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat:join', { chatId });
    });

    socket.on('chat:message:new', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 100);
      api.post(`/chats/${chatId}/read`).catch(console.error);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [api, chatId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:message:send', { chatId, content: newMessage.trim() }, (res) => {
        setSending(false);
        if (res.ok && res.message) {
          setNewMessage('');
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.message!.id)) return prev;
            return [...prev, res.message!];
          });
          setTimeout(scrollToBottom, 100);
        }
      });
    } else {
      api.post<ChatMessageDto>(`/chats/${chatId}/messages`, { content: newMessage.trim() })
        .then((res) => {
          setNewMessage('');
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.data.id)) return prev;
            return [...prev, res.data];
          });
          setTimeout(scrollToBottom, 100);
        })
        .finally(() => setSending(false));
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  if (error || !chat || !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? 'Чат недоступний'}
        </div>
      </main>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const avatarUrl = chat.participant.avatarPath ? `${baseUrl}${chat.participant.avatarPath}` : null;

  return (
    <main className="flex h-screen flex-col bg-background">
      <header className="flex-shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/chats" prefetch={false} className="mr-2 text-muted-foreground hover:text-foreground">
              ← Назад
            </Link>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={chat.participant.name} className="h-8 w-8 rounded-full border border-border object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                <span className="text-sm font-semibold">{chat.participant.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground">{chat.participant.name}</h1>
              <p className="text-xs leading-tight text-muted-foreground">{chat.participant.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden bg-card shadow-sm sm:my-4 sm:rounded-lg sm:border sm:border-border">
        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'rounded-br-sm bg-success text-success-foreground'
                      : 'rounded-bl-sm border border-border bg-card text-foreground shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                  <div className={`mt-1 text-right text-[10px] ${isMe ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-border bg-card p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишіть повідомлення..."
              className="flex-1 rounded-full border border-input bg-muted px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground transition-colors hover:bg-success/90 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-5 w-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
